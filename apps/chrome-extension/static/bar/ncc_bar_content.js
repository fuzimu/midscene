// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// 初始化函数，由父页面通过 postMessage 调用
function initBarFrameScripts() {

  const PROMPT_INPUT_ID = 'midscene-extension-prompt-input';
  const RESULT_INPUT_ID = 'midscene-extension-result-input';
  const XPATH_INPUT_ID = 'midscene-extension-xpath-input';
  
  // 为所有 input 添加点击事件，显示 value 值
  const addClickHandler = (inputElement) => {
    if (inputElement && !inputElement._clickHandlerAdded) {
      inputElement.addEventListener('click', (event) => {
        event.stopPropagation(); // 阻止事件冒泡
        event.preventDefault(); // 阻止默认行为
        const value = event.target.value || '';
        alert(`${value || '(empty)'}`);
      });
      inputElement._clickHandlerAdded = true; // 标记已添加，避免重复添加
    }
  };
  
  const promptInput = document.getElementById(PROMPT_INPUT_ID);
  const resultInput = document.getElementById(RESULT_INPUT_ID);
  const xpathInput = document.getElementById(XPATH_INPUT_ID);
  
  addClickHandler(promptInput);
  addClickHandler(resultInput);
  addClickHandler(xpathInput);
  
  // 输入框事件监听
  if (promptInput) {
    const handleInputEvent = (event) => {
      const target = event.target;
      const value = target.value;
      if(value){
        setTimeout(() => {
          try {
            chrome.runtime.sendMessage({ action: 'setPrompt', value }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn('[NCC Bar] setPrompt error:', chrome.runtime.lastError.message);
              }
            });
          } catch (e) {
            if (e instanceof Error && e.message.includes('Extension context invalidated')) {
              console.warn('[NCC Bar] Extension context invalidated, please reload the page');
            } else {
              console.error('[NCC Bar] Failed to send setPrompt message:', e);
            }
          }
        }, 350);
      }
    };

    promptInput.addEventListener('input', handleInputEvent);

    // 拦截 value 属性的设置，自动触发 input 事件
    // 这样当 Selenium 或其他脚本直接设置 value 时，也能触发 input 事件
    const originalValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (originalValue) {
      Object.defineProperty(promptInput, 'value', {
        get: function() {
          return originalValue.get?.call(this) || '';
        },
        set: function(newValue) {
          const oldValue = originalValue.get?.call(this) || '';
          originalValue.set?.call(this, newValue);
          // 如果值发生变化，手动触发 input 事件
          if (oldValue !== String(newValue)) {
            setTimeout(() => {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true });
              this.dispatchEvent(inputEvent);
            }, 0);
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  }
  //监听alt+r快捷键（带防抖处理）
  const handleAltR = debounce((event) => {
    if (event.altKey && event.key === 'r') {
      chrome.runtime.sendMessage({ action: 'runThePrompt' });
    }
  }, 300);
  
  document.addEventListener('keydown', handleAltR);
  // 监听来自父页面的 postMessage
  window.addEventListener('message', (event) => {
    // 注意：在生产环境中应该验证 event.origin
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // 更新 xpath 输入框
    if (data.type === 'updateXpath') {
      const xpathInput = document.getElementById(XPATH_INPUT_ID);
      if (xpathInput) {
        xpathInput.value = data.value || '';
      }
    }

    // 更新 result 输入框
    if (data.type === 'updateResult') {
      const resultInput = document.getElementById(RESULT_INPUT_ID);
      if (resultInput) {
        resultInput.value = data.value || '';
      }
    }
  });
  console.log('[NCC Bar] iframe scripts initialized successfully');
}
// 监听来自父页面的初始化消息
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'initBarFrameScripts') {
    initBarFrameScripts();
  }
});
// 如果父页面已经发送了消息，立即执行初始化
// 延迟执行以确保 DOM 已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // 等待一下，让父页面有机会发送初始化消息
    setTimeout(() => {
      if (!window.barFrameScriptsInitialized) {
        initBarFrameScripts();
        window.barFrameScriptsInitialized = true;
      }
    }, 100);
  });
} else {
  // DOM 已经加载完成，等待父页面发送初始化消息
  setTimeout(() => {
    if (!window.barFrameScriptsInitialized) {
      initBarFrameScripts();
      window.barFrameScriptsInitialized = true;
    }
  }, 100);
}