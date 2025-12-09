/// <reference types="chrome" />

import { uuid } from '@midscene/shared/utils';
import type { WebUIContext } from '@midscene/web';

const workerMessageTypes = {
  SAVE_CONTEXT: 'save-context',
  GET_CONTEXT: 'get-context',
};

// save screenshot
interface WorkerRequestSaveContext {
  context: WebUIContext;
}

// get screenshot
interface WorkerRequestGetContext {
  id: string;
}

// console-browserify won't work in worker, so we need to use globalThis.console
const console = globalThis.console;

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// cache data between sidepanel and fullscreen playground
const cacheMap = new Map<string, WebUIContext>();

// Store connected ports for message forwarding
const connectedPorts = new Set<chrome.runtime.Port>();

// Listen for connections from extension pages
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'record-events') {
    connectedPorts.add(port);
    port.onDisconnect.addListener(() => {
      connectedPorts.delete(port);
    });
  } else {
    console.log('[ServiceWorker] Unknown port name:', port.name);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    try {
      const tabId = sender.tab?.id;
      if (tabId === undefined) {
        sendResponse({ success: false, error: 'No sender tab id' });
        return;
      }
      chrome.sidePanel
        .open({ tabId })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.warn('[ServiceWorker] Failed to open side panel:', error);
          sendResponse({ success: false, error: String(error) });
        });
    } catch (error) {
      console.warn('[ServiceWorker] Failed to open side panel:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }

  // 从工具栏 iframe 转发 midsceneResultValue 到当前活动标签页的 content script
  if (request.action === 'midsceneResultValue') {
    const forwardToTab = (tid: number, value: string) => {
      chrome.tabs.sendMessage(
        tid,
        { action: 'midsceneResultValue', value },
        () => {
          // 忽略回调错误（例如目标 tab 没有内容脚本）
        },
      );
    };

    const value = typeof request.value === 'string' ? request.value : '';

    // 如果有 sender.tab.id，优先用它
    if (sender.tab && sender.tab.id !== undefined) {
      forwardToTab(sender.tab.id, value);
      sendResponse({ success: true });
      return true;
    }

    // 否则转发到当前活动 tab
    chrome.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then((tabs) => {
        const active = tabs[0];
        if (active?.id !== undefined) {
          forwardToTab(active.id, value);
        }
        sendResponse({ success: true });
      })
      .catch(() => {
        sendResponse({ success: false });
      });
    return true;
  }

  // 更新修复后的xpath路径到输入框
  if (request.action === 'updateXPathInput') {
    const updateXPath = (tid: number) => {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tid },
          func: (value: string) => {
            // 查找 ncc-bar iframe 并向其发送 postMessage 来更新 xpath input
            const barFrame = document.getElementById('ncc-bar') as HTMLIFrameElement;
            if (barFrame && barFrame.contentWindow) {
              barFrame.contentWindow.postMessage({
                type: 'updateXpath',
                value: value
              }, '*');
            }
          },
          args: [String(request.value)],
          world: 'ISOLATED',
        });
        sendResponse({ success: true });
      } catch (error) {
        console.warn('[ServiceWorker] Failed to update xpath input:', error);
        sendResponse({ success: false, error: String(error) });
      }
    };

    const senderTabId = sender.tab?.id;
    if (senderTabId !== undefined && request.value !== undefined) {
      updateXPath(senderTabId);
      return true;
    }

    if (request.value !== undefined) {
      chrome.tabs
        .query({ active: true, lastFocusedWindow: true })
        .then((tabs) => {
          const active = tabs[0];
          if (active?.id !== undefined) {
            updateXPath(active.id);
          } else {
            sendResponse({ success: false, error: 'No active tab id' });
          }
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    }

    sendResponse({ success: false, error: 'No value provided' });
    return true;
  }

  // Update injected result input with execution result
  if (request.action === 'updateResultInput') {
    const updateInput = (tid: number) => {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tid },
          func: (value: string) => {
            // 查找 ncc-bar iframe 并向其发送 postMessage 来更新 result input
            const barFrame = document.getElementById('ncc-bar') as HTMLIFrameElement;
            if (barFrame && barFrame.contentWindow) {
              barFrame.contentWindow.postMessage({
                type: 'updateResult',
                value: value
              }, '*');
            }
          },
          args: [String(request.value)],
          world: 'ISOLATED',
        });
        sendResponse({ success: true });
      } catch (error) {
        console.warn('[ServiceWorker] Failed to update result input:', error);
        sendResponse({ success: false, error: String(error) });
      }
    };

    const senderTabId = sender.tab?.id;
    if (senderTabId !== undefined && request.value !== undefined) {
      updateInput(senderTabId);
      return true;
    }

    // Fallback to current active tab when sender.tab is undefined (e.g., from extension page)
    if (request.value !== undefined) {
      chrome.tabs
        .query({ active: true, lastFocusedWindow: true })
        .then((tabs) => {
          const active = tabs[0];
          if (active?.id !== undefined) {
            updateInput(active.id);
          } else {
            sendResponse({ success: false, error: 'No active tab id' });
          }
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    }

    sendResponse({ success: false, error: 'No value provided' });
    return true;
  }

  // Handle screenshot capture request
  if (request.action === 'captureScreenshot') {
    if (sender.tab && sender.tab.id !== undefined) {
      chrome.tabs.captureVisibleTab(
        sender.tab.windowId,
        { format: 'png' },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error(
              '[ServiceWorker] Failed to capture screenshot:',
              chrome.runtime.lastError,
            );
            sendResponse(null);
          } else {
            sendResponse(dataUrl);
          }
        },
      );
      return true; // Keep the message channel open for async response
    } else {
      console.error('[ServiceWorker] No valid tab for screenshot capture');
      sendResponse(null);
      return true;
    }
  }

  // Forward recording events to connected extension pages
  if (request.action === 'events' || request.action === 'event') {
    if (connectedPorts.size === 0) {
      console.warn(
        '[ServiceWorker] No connected ports to forward recording events to',
      );
    }

    connectedPorts.forEach((port) => {
      try {
        port.postMessage(request);
      } catch (error) {
        console.error(
          '[ServiceWorker] Failed to forward message to port:',
          error,
        );
        connectedPorts.delete(port); // Remove invalid port
      }
    });
    sendResponse({ success: true });
    return true;
  }

  switch (request.type) {
    case workerMessageTypes.SAVE_CONTEXT: {
      const payload: WorkerRequestSaveContext = request.payload;
      const { context } = payload;
      const id = uuid();
      cacheMap.set(id, context);
      sendResponse({ id });
      break;
    }
    case workerMessageTypes.GET_CONTEXT: {
      const payload: WorkerRequestGetContext = request.payload;
      const { id } = payload;
      const context = cacheMap.get(id) as WebUIContext;
      if (!context) {
        sendResponse({ error: 'Screenshot not found' });
      } else {
        sendResponse({ context });
      }

      break;
    }
    default:
      sendResponse({ error: 'Unknown message type' });
      break;
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});


// Additionally inject NCC Bar content script (separate listener; original kept intact)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;
  const isHttp =
    tab.url.startsWith('http://') || tab.url.startsWith('https://');
  if (!isHttp) return;

  try {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/ncc-bar-content.js'],
      world: 'ISOLATED',
    });
    // 注意：不再自动发送 refresh_page 消息
    // content script 会在页面加载完成后自动调用 refresh_observer
    // 如果需要手动触发，可以从其他地方发送 { action: 'refresh_page' } 消息
  } catch (e) {
    console.warn('[ServiceWorker] Failed to inject NCC Bar:', e);
  }
});
