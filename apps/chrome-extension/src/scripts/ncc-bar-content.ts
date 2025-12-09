/// <reference types="chrome" />

'use strict';

/**
 * NCC Bar Content Script
 * 在页面中注入显示栏和相关事件监听
 */

// 初始化 ncc 命名空间
var ncc = (window as any).ncc || {};
var reference_control_all = true;
/**
 * all变量
 */
var mousemove_r_all = 0;//需要单独+鼠标移动的控件，1为需要
var mouse_button_all = 0; //0为左键，2为右键，1为滑轮
var input_record_all: HTMLInputElement | HTMLTextAreaElement | null = null; //上一次el元素记录，用于提取input值
var input_k_all = 0;//判断是否需要提取input，0是否，1是是，本次点击的节点是input，下次默认提取
var input_start_all = 0;//上一次input的默认值是不是空，空就不用清空动作了，0表示空。
var input_disabled_all = 0;//判断input是否包含disabled属性，1是包含cibsike
var esc_record_all = 0;//键盘esc退出操作，1代表加上该动作
var repeat_r_all = "";//连续重复标记检测
var table_r_all = 0;//表格标记、控件记录
var subbtn_r_all = 0;//如果已经有了_sub-btn，后续就不省略了
var tree_r_all = 0;//树标记、控件记录
var li_node_all = 0;//li节点记录
var class_tree_node_all = 0;//class树记录
var table_body_r_all = 0;//table-body-out或inner只记录一个
var text_display_all = "";//用于插件的值里显示文本内容
var para_record_all = "";//参数变量，全局变量，2020.6月改。
/**
 * mouseup、mousedown、dbclick方法变量
 */
var license_k = 0;//已经获取到监听后为1 
var clickUp_store: NodeJS.Timeout | null = null;//mouseup防抖计时器
var clickDown_store: NodeJS.Timeout | null = null;//mousedown防抖计时器
var dbclick_store: NodeJS.Timeout | null = null;//dbclick防抖计时器
var click_query_bak: string | null = null;//单击获取内容备份，新交互记录第一次点击参数，外加双击标识。
/**
 * 
 */
var errors_map: Map<string, string> = new Map();//当前页面所有元素
var duplicate_map: Map<string, any> = new Map();//保存重复元素
var checkmode: boolean = false;//是否为检查模式
var autoDownload: boolean = false;//检查元素时是否自动下载错误文件
/**
 * 滚动条元素变量
 */
var xscrollableElements: Set<HTMLElement> = new Set();//当前页面所有水平滚动条元素
var yscrollableElements: Set<HTMLElement> = new Set();//当前页面所有垂直滚动条元素
/**
 * 滚动执行锁，防止重复执行
 */
var scrollExecuting: boolean = false;
/**
 * 横向滚动条初始位置记录（用于重置）
 */
var horizontalScrollInitialPositions: Map<HTMLElement, number> = new Map();

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 500,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    // 使用箭头函数，避免 this 绑定被意外改变
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * 正则表达式判断xpath是否合法
 */
var validRegexes = [
  //菲姐文档规则
  /fieldid="total-row"/, // 合计行规则，包含"total-row"
  /fieldid="search-area"/, // 查询区，包含fieldid="search-area"
  /fieldid="bottom-area"/, // 底栏规则，包含fieldid="bottom-area"
  /fieldid="flow-area"/, // 审批流控件规则，包含fieldid="flow-area"
  /fieldid="tabs-area"/, // 页签导航栏规则，包含fieldid="tabs-area"
  /fieldid="tips-window"/, // 提示框规则，包含fieldid="tips-window"
  /fieldid="header-area"/, // 标题栏规则，包含fieldid="header-area"
  /fieldid="report-area"/, // 报表区规则，包含fieldid="report-area"
  /fieldid="pagination-div"/, // 分页栏规则，包含fieldid="pagination-div"
  /fieldid="(.+)_top-area"/, // 顶部共享区域规则，包含fieldid="***_top-area"，***为任意大于1个的字符串
  /fieldid="(.+)_tree"/, // 树控件规则，包含fieldid="***_tree"，***为任意大于1个的字符串
  /fieldid="(.+)_node"/, // 树节点规则，包含fieldid="***_node"，***为任意大于1个的字符串
  /fieldid="(.+)_title"/, // 标题规则，包含fieldid="***_title"，***为任意大于1个的字符串
  /fieldid="(.+)_group"/, // 分组区规则，包含fieldid="***_group"，***为任意大于1个的字符串 
  /fieldid="(.+)_table"/, // 表格控件规则，包含fieldid="***_table"，***为任意大于1个的字符串
  /fieldid="(.+)_area"/, // 通用区域模版规则，包含fieldid="***_area"，***为任意大于1个的字符串
  /fieldid="(.+)_form-area"/, // 表单区规则，包含fieldid="***_form-area"，***为任意大于1个的字符串
  /fieldid="(.+)_list-area"/, // 列表区规则，包含fieldid="***_list-area"，***为任意大于1个的字符串
  /fieldid="(.+)_tree-area"/, // 树区域规则，包含fieldid="***_tree-area"，***为任意大于1个的字符串
  /fieldid="(.+)_list-item"/, // 列表项规则，包含fieldid="***_list-item"，***为任意大于1个的字符串
  /fieldid="(.+)_table-area"/, // 表格区规则，包含fieldid="***_table-area"，***为任意大于1个的字符串
  /fieldid="(.+)_modal-area"/, // 弹窗区规则，包含fieldid="***_modal-area"，***为任意大于1个的字符串
  /fieldid="(.+)_refer-window"/, // 参照区弹窗规则，包含fieldid="***_refer-window"，***为任意大于1个的字符串
  //额外规则
  /@class,"(.+)_btn_list"/, // 下拉框内容，包含@class,"***_btn_list"，***为任意大于1个的字符串
  /fieldid="nav-group"/, // 合计行规则，包含fieldid="nav-group"
  /fieldid="nav-node"/, // 合计行规则，包含fieldid="nav-node"
  /@class,"fieldid_tips-window"/ // 提示信息弹窗规则，包含@class,"fieldid_tips-window"
];
/**
 * 正则表达式过滤无效xpath
 */
var filterRegexes = [
  /^\/\/\*\[@fieldid="microapp-content-actived"\]$/, // xpath全等于//*[@fieldid="microapp-content-actived"]
  /\[contains\(@class,"icon-mianbaoxie"\)\]/, // xpath包含[contains(@class,"icon-mianbaoxie")]
  /fieldid="pagination-div"/, //xpath包含fieldid="pagination-div"
];
/**
 * 正则表达式筛选table组件,以//*[@fieldid="***_table"]开头的字符串，***代表至少一个任意字符
 */
var tableContainRegexes = /fieldid="(.+)_table"/;
/**
 * 正则表达式筛选table组件中的有效判断xpath:以//*[@fieldid="***"]结尾的字符串，***代表至少一个任意字符
 */
var tableTailRegexes = /\/\/tr\/\/(.+)\[@fieldid="[\w.-]+"\]$/;

/**
 * 过滤掉report中包含table的xpath
 */
var reportTableRegexes = /fieldid="report-area"(.+)table/
/**
 * 判断xpath中是否包含fieldid时，需要提前过滤掉的字符串
 */
var removeFieldidStr = 'fieldid="microapp-content-actived"]'


/**
 * show_bar 构造函数
 */
ncc.show_bar = function (this: any) {
  // 消息处理函数
  this.handle_request = function (
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) {
    switch (request.action) {
      case 'midsceneResultValue':
        // 如果正在执行滚动，忽略重复的消息
        if (scrollExecuting) {
          sendResponse({ success: false, reason: 'already executing' });
          return true; // 保持消息通道打开
        }
        if (request && typeof request.value === 'string') {
          this.scrollToXAndY(request.value);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, reason: 'invalid value' });
        }
        return true; // 保持消息通道打开，允许异步响应
      default:
        console.log('未处理的消息 action:', request.action);
        break;
    }
  };

  // 鼠标事件处理函数
  this.mouse_move = function (event: MouseEvent) {
    const id = (event.target as HTMLElement)?.id || '';
    if(!id.includes("midscene-extension")){
      var way = "w";
      //记录鼠标左右键点击
      var mouse_button = event.button;
      mouse_button_all = mouse_button;
      this.current_el = event.target;
      const newXpath = this.update_query_and_bar(this.current_el, way);
      // 通过 postMessage 更新 iframe 中的 xpath 输入框
      try {
        const xpathInput = this.getXpathInput();
        if (xpathInput) {
          xpathInput.value = newXpath;
        } else {
          // 如果无法直接访问，使用 postMessage
          this.bar_frame?.contentWindow?.postMessage({
            type: 'updateXpath',
            value: newXpath
          }, '*');
        }
      } catch (e) {
        // 更新Xpath到输入框失败，静默处理
      }
    }
  };

  // iframe 中的鼠标事件处理（mousedown）
  this.mouse_move_1 = function (event: MouseEvent) {
    const id = (event.target as HTMLElement)?.id || '';
    if(!id.includes("midscene-extension")){
      var way = "i";
      //记录鼠标左右键点击
      var mouse_button = event.button;
      mouse_button_all = mouse_button;
      this.current_el = event.target;
      const newXpath = this.update_query_and_bar(this.current_el, way);
      // 通过 postMessage 更新 iframe 中的 xpath 输入框
      try {
        const xpathInput = this.getXpathInput();
        if (xpathInput) {
          xpathInput.value = newXpath;
        } else {
          // 如果无法直接访问，使用 postMessage
          this.bar_frame?.contentWindow?.postMessage({
            type: 'updateXpath',
            value: newXpath
          }, '*');
        }
      } catch (e) {
        // 更新Xpath到输入框失败，静默处理
      }
    }
  };

  // 双击事件处理
  this.mouse_move_2 = function (event: MouseEvent) {
    const id = (event.target as HTMLElement)?.id || '';
    if(!id.includes("midscene-extension")){
      var way = "dw";
      //记录鼠标左右键点击
      var mouse_button = event.button;
      mouse_button_all = mouse_button;
      this.current_el = event.target;
      const newXpath = this.update_query_and_bar(this.current_el, way);
      // 通过 postMessage 更新 iframe 中的 xpath 输入框
      try {
        const xpathInput = this.getXpathInput();
        if (xpathInput) {
          xpathInput.value = newXpath;
        } else {
          // 如果无法直接访问，使用 postMessage
          this.bar_frame?.contentWindow?.postMessage({
            type: 'updateXpath',
            value: newXpath
          }, '*');
        }
      } catch (e) {
        // 更新Xpath到输入框失败，静默处理
      }
    }
  };

  // iframe 中的双击事件处理
  this.mouse_move_3 = function (event: MouseEvent) {
    const id = (event.target as HTMLElement)?.id || '';
    if(!id.includes("midscene-extension")){
      var way = "di";
      //记录鼠标左右键点击
      var mouse_button = event.button;
      mouse_button_all = mouse_button;
      this.current_el = event.target;
      const newXpath = this.update_query_and_bar(this.current_el, way);
      // 通过 postMessage 更新 iframe 中的 xpath 输入框
      try {
        const xpathInput = this.getXpathInput();
        if (xpathInput) {
          xpathInput.value = newXpath;
        } else {
          // 如果无法直接访问，使用 postMessage
          this.bar_frame?.contentWindow?.postMessage({
            type: 'updateXpath',
            value: newXpath
          }, '*');
        }
      } catch (e) {
        // 更新Xpath到输入框失败，静默处理
      }
    }
  };

  // mouseup 事件处理
  this.mouse_move_4 = function (event: MouseEvent) {
    const id = (event.target as HTMLElement)?.id || '';
    if(!id.includes("midscene-extension")){
      var way = "uw"; //uw代表up动作的框架外事件
      //记录鼠标左右键点击
      var mouse_button = event.button;
      mouse_button_all = mouse_button;
      this.current_el = event.target;
      var newXpath = this.update_query_and_bar(this.current_el, way);
      // 通过 postMessage 更新 iframe 中的 xpath 输入框
      try {
        const xpathInput = this.getXpathInput();
        if (xpathInput) {
          xpathInput.value = newXpath;
        } else {
          // 如果无法直接访问，使用 postMessage
          this.bar_frame?.contentWindow?.postMessage({
            type: 'updateXpath',
            value: newXpath
          }, '*');
        }
      } catch (e) {
        // 更新Xpath到输入框失败，静默处理
      }
    }
  };

  // iframe 中的 mouseup 事件处理
  this.mouse_move_5 = function (event: MouseEvent) {
    const id = (event.target as HTMLElement)?.id || '';
    if(!id.includes("midscene-extension")){
      var way = "ui";
      //记录鼠标左右键点击
      var mouse_button = event.button;
      mouse_button_all = mouse_button;
      this.current_el = event.target;
      const newXpath = this.update_query_and_bar(this.current_el, way);
      // 通过 postMessage 更新 iframe 中的 xpath 输入框
      try {
        const xpathInput = this.getXpathInput();
        if (xpathInput) {
          xpathInput.value = newXpath;
        } else {
          // 如果无法直接访问，使用 postMessage
          this.bar_frame?.contentWindow?.postMessage({
            type: 'updateXpath',
            value: newXpath
          }, '*');
        }
      } catch (e) {
        // 更新Xpath到输入框失败，静默处理
      }
    }
  };

  // 检查扩展上下文是否有效
  this.isExtensionContextValid = function () {
    try {
      // 尝试访问 chrome.runtime.id，如果扩展上下文无效会抛出错误
      return !!chrome.runtime?.id;
    } catch (e) {
      return false;
    }
  };

  // 所有 Alt 快捷键的防抖函数（1秒内只执行一次）
  var altODebounced = debounce(function() {
    console.log(altODebounced);
    chrome.runtime.sendMessage({ action: 'openSidePanel' });
  }, 500);

  var altKDebounced = debounce(function() {
    chrome.runtime.sendMessage({ action: 'switchAction', value: 'aiAsk' });
  }, 500);

  var altXDebounced = debounce(function() {
    chrome.runtime.sendMessage({ action: 'switchAction', value: 'aiAct' });
  }, 500);
  // Alt+P 的防抖函数，直接执行滚动，使用元素的 clientWidth 和 clientHeight
  var that = this;
  var altPConsoleDebounced = debounce(function() {
    // 如果正在执行滚动，忽略新的请求
    if (scrollExecuting) {
      return;
    }
    // 直接调用 scrollToXAndY，传入 null 表示使用元素的 clientWidth 和 clientHeight
    that.scrollToXAndY();
  }, 500);

  // 使用防抖机制防止多个监听器重复执行
  this.handle_keydown = function (event: KeyboardEvent) {
    if (event.altKey) {
      const key = event.key.toLowerCase();
      // 检查是否是我们支持的快捷键
      const supportedKeys = ['o', 'k', 'x', 'p'];
      if (!supportedKeys.includes(key)) {
        // 不是我们支持的快捷键，直接返回
        return;
      }
      // 立即阻止事件传播和默认行为（必须在同步阶段调用才有效）
      // 这样可以防止在可编辑元素中输入字符（如 Alt+P 时输入 'p'）
      event.preventDefault();
      event.stopPropagation();
      // 检查目标元素是否为可编辑元素（input, textarea, contenteditable）
      const target = event.target as HTMLElement;
      const isEditable = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        (target as HTMLInputElement).contentEditable === 'true'
      );
      
      // 如果是在可编辑元素中，确保阻止默认行为（防止输入字符）
      if (isEditable) {
        // 再次确认阻止默认行为，确保不会输入字符
        event.preventDefault();
        event.stopPropagation();
      }
      // 使用防抖函数处理所有 Alt 快捷键（1秒内只执行一次）
      if(key === 'o'){
        // Alt+O: 打开侧边栏
        altODebounced();
      }else if(key === 'k'){
        // Alt+K: 设置全局变量action_type为aiAsk
        altKDebounced();
      }else if(key === 'x'){
        // Alt+X: 设置全局变量action_type为aiAction
        altXDebounced();
      }else if(key === 'p'){
        // Alt+P: 输出可见的可滚动元素（使用防抖确保只执行一次）
        altPConsoleDebounced(); 
      }
    }
  };

  // 阻止右键菜单事件处理（排除工具栏元素）
  this.handle_contextmenu = function (event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }
    // 排除工具栏元素（包括 iframe 和工具栏容器）
    const id = target.id || '';
    if (id.includes('midscene-extension') || 
        id === 'ncc-bar' ||
        target.closest('#ncc-bar') ||
        target.closest('#midscene-extension-container')) {
      return;
    }
    // 阻止右键菜单弹窗
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  // 绑定方法
  this.bound_handle_request = this.handle_request.bind(this);
  this.bound_mouse_move = this.mouse_move.bind(this);
  this.bound_mouse_move_1 = this.mouse_move_1.bind(this);
  this.bound_mouse_move_4 = this.mouse_move_4.bind(this);
  this.bound_mouse_move_5 = this.mouse_move_5.bind(this);
  this.bound_mouse_move_2 = this.mouse_move_2.bind(this);
  this.bound_mouse_move_3 = this.mouse_move_3.bind(this);
  this.bound_handle_keydown = this.handle_keydown.bind(this);
  this.bound_handle_contextmenu = this.handle_contextmenu.bind(this);
  // 变量
  this.current_el = null;

  // 辅助方法：从 iframe 中获取输入框（跨域情况下返回 null，使用 postMessage 代替）
  this.getXpathInput = function () {
    try {
      const iframeDoc = this.bar_frame?.contentDocument || this.bar_frame?.contentWindow?.document;
      if (iframeDoc) {
        return iframeDoc.getElementById('midscene-extension-xpath-input') as HTMLInputElement | null;
      }
    } catch (e) {}
    return null;
  };

  // 初始化 iframe 中的脚本（通过 postMessage）
  this.initBarFrameScripts = function () {
    try {
      // 尝试直接访问 iframe document（同源情况下）
      const iframeDoc = this.bar_frame.contentDocument || this.bar_frame.contentWindow?.document;
      if (iframeDoc) {
        // 同源，可以直接访问，但脚本已经在 HTML 文件中，不需要额外操作
        return;
      }
    } catch (e) {
      // 跨域情况，使用 postMessage 触发初始化
    }
    
    // 通过 postMessage 发送初始化消息
    try {
      this.bar_frame.contentWindow?.postMessage({
        type: 'initBarFrameScripts'
      }, '*');
    } catch (e) {
      console.warn('[NCC Bar] Failed to send initialization message:', e);
    }
  };

  // 绑定显示栏
  this.bar_frame = document.createElement('iframe');
  this.bar_frame.id = 'ncc-bar';
  try {
    // 检查扩展上下文是否有效
    if (this.isExtensionContextValid()) {
      this.bar_frame.src = chrome.runtime.getURL('bar/ncc_bar_content.html');
    } else {
      console.warn('[NCC Bar] Extension context invalidated, cannot set iframe src');
    }
  } catch (e) {
    console.error('[NCC Bar] Failed to get extension URL:', e);
  }
  // 设置 iframe 样式，确保可见
  this.bar_frame.style.position = 'fixed';
  this.bar_frame.style.right = '3px';
  this.bar_frame.style.top = '0';
  this.bar_frame.style.width = '10px';
  // 高度设置为 35px
  this.bar_frame.style.height = '35px';
  this.bar_frame.style.border = 'none';
  // 设置为 auto 以允许点击 iframe 内的元素
  this.bar_frame.style.pointerEvents = 'auto';
  this.bar_frame.style.zIndex = '2147483646';
  this.bar_frame.style.background = 'transparent';
  
  // 将显示栏添加到 DOM 树
  const appendBarFrame = () => {
    // 检查是否已经存在，避免重复添加
    if (document.getElementById('ncc-bar')) {
      return;
    }
    if (document.body) {
      try {
        document.body.appendChild(this.bar_frame);
        
        // 监听 iframe 加载事件
        this.bar_frame.addEventListener('load', () => {
          this.initBarFrameScripts();
        }, { once: true });
        
        // 监听 iframe 错误事件
        this.bar_frame.addEventListener('error', (e: Event) => {
          console.error('[NCC Bar] iframe load error:', e);
        }, { once: true });
      } catch (e) {
        console.error('[NCC Bar] Failed to append iframe:', e);
      }
    } else {
      // 如果 body 还未加载，等待 DOM 加载完成
      document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('ncc-bar')) {
          try {
            document.body.appendChild(this.bar_frame);
          } catch (e) {
            console.error('[NCC Bar] Failed to append iframe after DOMContentLoaded:', e);
          }
        }
      }, { once: true });
    }
  };
  
  appendBarFrame();
  //注册监听器（确保不会重复注册）
  try {
    if ((globalThis as any).chrome?.runtime?.onMessage) {
      // 先移除可能存在的旧监听器，避免重复注册
      (globalThis as any).chrome.runtime.onMessage.removeListener(this.bound_handle_request);
      // 添加新监听器
      (globalThis as any).chrome.runtime.onMessage.addListener(this.bound_handle_request);
    } else {
      console.warn('chrome.runtime.onMessage 不可用');
    }
  } catch (e) {
    console.error('绑定消息监听器失败:', e);
  }
 
};

ncc.show_bar.prototype.scrollToXAndY = function() {
  // 如果正在执行滚动，直接返回
  if (scrollExecuting) {
    return;
  }
  // 立即设置执行锁，防止重复执行
  scrollExecuting = true;
  // 延迟释放锁的定时器
  let releaseLockTimeout: NodeJS.Timeout | null = null;
  try {
    // 获取可见的滚动条元素
    const horizontalElements = Array.from(xscrollableElements).filter((element: HTMLElement) => isElementVisibleInViewport(element));
    const verticalElements = Array.from(yscrollableElements).filter((element: HTMLElement) => isElementVisibleInViewport(element));
    let hasAction = false;
    let allHorizontalAtEnd = true; // 标记所有水平滚动条是否都到底
    // 优先处理水平滚动
    if (horizontalElements.length > 0) {
      hasAction = true;
      // 检查所有水平滚动条是否都到底，并执行一次横向滚动
      for (const element of horizontalElements) {
        try {
          const currentScrollLeft = element.scrollLeft;
          const maxScrollLeft = element.scrollWidth - element.clientWidth;
          // 如果还没有记录初始位置，记录它
          if (!horizontalScrollInitialPositions.has(element)) {
            horizontalScrollInitialPositions.set(element, currentScrollLeft);
          }
          // 检查是否到底（允许小的误差，因为可能不是整数）
          if (currentScrollLeft < maxScrollLeft - 1) {
            allHorizontalAtEnd = false;
            // 还没到底，执行一次横向滚动
            const scrollDistance = element.clientWidth-50;
            const newScrollLeft = Math.min(currentScrollLeft + scrollDistance, maxScrollLeft);
            element.scrollTo({
              left: newScrollLeft,
              behavior: 'smooth'
            });
            break; // 每次调用只执行一次滚动，跳出循环
          }
        } catch (e) {
          console.warn(`滚动元素失败:`, e, element);
        }
      }
      // 如果所有水平滚动条都到底了，且存在垂直滚动条
      if (allHorizontalAtEnd && verticalElements.length > 0) {
        // 执行一次垂直滚动
        for (const element of verticalElements) {
          try {
            const currentScrollTop = element.scrollTop;
            const maxScrollTop = element.scrollHeight - element.clientHeight;
            const scrollDistance = element.clientHeight-50;
            const newScrollTop = Math.min(currentScrollTop + scrollDistance, maxScrollTop);
            element.scrollTo({
              top: newScrollTop,
              behavior: 'smooth'
            });
            break; // 只执行一次滚动
          } catch (e) {
            console.warn(`滚动元素失败:`, e, element);
          }
        }
        // 重置所有水平滚动条到初始位置
        horizontalElements.forEach((element) => {
          try {
            const initialPosition = horizontalScrollInitialPositions.get(element) || 0;
            element.scrollTo({
              left: initialPosition,
              behavior: 'smooth'
            });
          } catch (e) {
            console.warn(`重置滚动位置失败:`, e, element);
          }
        });
      }
    } else if (verticalElements.length > 0) {
      // 如果没有水平滚动条，但有垂直滚动条，直接执行垂直滚动
      hasAction = true;
      for (const element of verticalElements) {
        try {
          const currentScrollTop = element.scrollTop;
          const maxScrollTop = element.scrollHeight - element.clientHeight;
          const scrollDistance = element.clientHeight-50;
          const newScrollTop = Math.min(currentScrollTop + scrollDistance, maxScrollTop);
          element.scrollTo({
            top: newScrollTop,
            behavior: 'smooth'
          });
          break; // 只执行一次滚动
        } catch (e) {
          console.warn(`滚动元素失败:`, e, element);
        }
      }
    } else {
      // 没有找到滚动条元素
      console.log('当前页面没有滚动条元素');
    }
    
    // 如果有滚动操作，等待动画完成；如果没有，立即释放
    const releaseDelay = hasAction ? 1000 : 300;
    releaseLockTimeout = setTimeout(() => {
      scrollExecuting = false;
      releaseLockTimeout = null;
    }, releaseDelay);
  } catch (e) {
    // 发生错误时也要释放锁
    console.error('scrollToXAndY 执行错误:', e);
    if (releaseLockTimeout) {
      clearTimeout(releaseLockTimeout);
    }
    scrollExecuting = false;
  }
};

//刷新页面时更新监听器
ncc.show_bar.prototype.refresh_observer = function () {
  /**
   * 监听内部页签mainiframe的切换和新增动作
   **/
  //监听mainiframe内的dom变化，将新增的有子节点的dom节点加入到全局map，并遍历该元素，将其xpath保存到数据库
  const mainFrameObserver = new MutationObserver((main_mutations) => {
    const filterMutations = main_mutations.filter(item => item.type === "childList" && item.addedNodes.length>0);
    if (filterMutations.length === 0) {
      return;
    }
    let firstNode = null;
    for(const mutation of filterMutations){
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[i];
        // 只关心新增的元素节点（Element），忽略文本节点等
        // 修复：检查节点本身是否为元素节点，而不是检查第一个子节点
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 如果有子节点，检查第一个子节点是否为元素节点
          if (node.childNodes.length > 0) {
            if (node.childNodes[0].nodeType === Node.ELEMENT_NODE) {
              firstNode = node;
          break;
            }
          } else {
            // 即使没有子节点，只要是元素节点也可以处理
            firstNode = node;
            break;
          }
        }
      }
      if(firstNode !== null){
        (window as any).xhBarInstance.add_core_license(firstNode);
        break;
      }
    }
  });

  //1.切换mainiframe时,给切换后main_ifram加上监听器，监听mainiframe中的dom变化
  //2.新增mainiframe时,给新增的main_ifram加上监听器，监听mainiframe中的dom变化，并把新增的body默认做一次扫描
  const observer = new  MutationObserver((mutations) => {
    let filterMutations = mutations.filter(item => item.target instanceof HTMLElement && item.target.classList.contains('nc-watermark') && item.target.style.display === "block");
    filterMutations = filterMutations.length>0?filterMutations:mutations.filter(item => item.target instanceof HTMLElement && item.target.classList.contains('nc_workbench-container-content'))
    if(filterMutations.length>0){
      const mainframe = (filterMutations[0].target as Element).querySelector('#mainiframe') as HTMLIFrameElement | null;
      if(mainframe){
        const mainFrameBody =  mainframe.contentDocument?.body || mainframe.contentWindow?.document.body;
        if(mainFrameBody && mainFrameBody.childNodes && mainFrameBody.childNodes.length>0){
          // 清空监听
          mainFrameObserver.disconnect();
          mainFrameObserver.observe(mainFrameBody, { childList: true, subtree: true });
        }else{
          mainframe.addEventListener('load', () => {
            const mainFrameDoc = mainframe.contentDocument || mainframe.contentWindow?.document;
            if (!mainFrameDoc) return;
            // 设置定时器来定期检查DOM状态
            let intervalId = setInterval(() => {
              if (mainFrameDoc && mainFrameDoc.readyState === 'complete' && !mainFrameDoc.querySelector('.base-loading-show')) {
                clearInterval(intervalId);  // 清除定时器
                // 清空监听
                mainFrameObserver.disconnect();
                // 开始观察mainframe内部变化
                if (mainFrameDoc.body) {
                  mainFrameObserver.observe(mainFrameDoc.body, { childList: true, subtree: true });
                  (window as any).xhBarInstance.add_core_license(mainFrameDoc.body);
                }
              }
            }, 1000); 
          })
        }
      }else{
        // 清空监听
        mainFrameObserver.disconnect();
        mainFrameObserver.observe(filterMutations[0].target as Element, { childList: true, subtree: true });
      }
    }
  });
  //切换内部页签监听
  const targetNode = document.querySelector('.content-wrapper')?document.querySelector('.content-wrapper'):document.querySelector('.nc-workbench-container');
  if(targetNode){
    observer.observe(targetNode, { childList:true,subtree:true,attributes:true })
  }
  //监听当前页面mainiframe
  let iframes = Array.from(document.querySelectorAll('.nc-watermark')).filter((mainEl): mainEl is HTMLElement => mainEl instanceof HTMLElement && mainEl.style.display === 'block');
  iframes = iframes.length !== 0?iframes:Array.from(document.querySelectorAll('.nc-workbench-container'));
  if (iframes.length > 0){
    const mainIframe = iframes[0].querySelector('#mainiframe') as HTMLIFrameElement | null;
    if(mainIframe){
      const mainFrameDoc =  mainIframe.contentDocument || mainIframe.contentWindow?.document;
      // 设置定时器来定期检查DOM状态
      let initMainIntervalId = setInterval(() => {
        if (mainFrameDoc && mainFrameDoc.readyState === 'complete' && !mainFrameDoc.querySelector('.base-loading-show')) {
          //清除定时器
          clearInterval(initMainIntervalId);  
          // 开始观察mainframe内部变化
          if (mainFrameDoc.body) {
            mainFrameObserver.observe(mainFrameDoc.body, { childList: true, subtree: true });
          }
          (window as any).xhBarInstance.add_core_license(mainFrameDoc.body);
        }
      }, 1000); 
    }else{
      // 开始观察mainframe内部变化
      mainFrameObserver.observe(iframes[0], { childList: true, subtree: true });
      (window as any).xhBarInstance.add_core_license();
    }
  }
}
//更新元素xpath至工具栏，发送保存请求
ncc.show_bar.prototype.update_query_and_bar = function (el: any, way: string) {
  var that = this;
  try {
    //记录参数和query的值。
    var el_bak = el;
    var query_bak: string | null = null;
    //延迟解决方案
    if (way == "w" || way == "i") {
      if (license_k == 0) {
        license_k = 1;
        clearTimeout(clickUp_store as NodeJS.Timeout);
        query_bak = get_xpath(el, way);
        click_query_bak = query_bak;
        //修复页面快速消失导致的代码失效，数据传输失败问题，比如登录按钮抓取不到。
        that.query = el_bak ? query_bak : '';
        clickUp_store = setTimeout(function (e: any) {
          license_k = 0;
        }, 400);
      }
    } else if (way == "uw" || way == "ui") {
      //点击检查按钮，处于检查模式时，执行检查模式逻辑
      if(checkmode){
        //获取元素对应的xpath，存入query_bak
        query_bak = get_xpath(el, way);
        //过滤掉无效xpath
        if (!query_bak) return;
        const q = query_bak;
        if (!filterRegexes.some(regex => regex.test(q))) {
          const q = query_bak as string;
          //对xpath是否合法进行校验
          let valid_error = validXpath(q)
          //不为null，说明校验不通过，将非法xpath和异常信息存入map
          if(valid_error !== null){
            errors_map.set(q,valid_error);
          }else{
            //以//input结尾的xpath
            let counts = 0;
            if(q.endsWith("//input")){
              //过滤掉具有class="hidden-input"的元素，将该元素在页面中查找匹配个数
              counts = findElementsByXPath(q+'[not(contains(@class, "hidden-input"))]');
            }
            //如果匹配个数大于1，即存在多个元素匹配则说明存在问题，一个xpath指定多个元素
            if(counts>1){
              errors_map.set(q,"input重复元素");
            }else{
              //判断扫描过的map中是否已存在
              if(duplicate_map.has(q)){
                //若存在，则获取扫描过的同xpath的元素
                let mapEl = duplicate_map.get(q);
                //对比xpath相同的先后两个元素，若不相同且相互不包含且不重叠，且页面有多个元素匹配
                if(el !== mapEl && !mapEl.contains(el) && !el.contains(mapEl) && !doElementsOverlap(mapEl,el) && findElementsByXPath(q) > 1){
                  errors_map.set(q,"重复元素");
                }
              }else{
                //过滤无效table的xpath
                if(filterTableElement(q)){
                  duplicate_map.set(q,el);
                }
              }
            }
          }
        }
      //手动点击页面元素，非检查模式
      }else{
        if (license_k == 0) {
          license_k = 1;
          clearTimeout(clickDown_store as NodeJS.Timeout);
          query_bak = get_xpath(el, way);
          click_query_bak = query_bak;
          that.query = el_bak ? query_bak : '';
          clickDown_store = setTimeout(function (e: any) {
              license_k = 0;
          }, 400);
        }
      }
    } else if (way == "dw" || way == "di") {
      license_k = 1;
      //清理单击事件
      clearTimeout(clickUp_store as NodeJS.Timeout);
      clearTimeout(clickDown_store as NodeJS.Timeout);
      clearTimeout(dbclick_store as NodeJS.Timeout);
      //修改双击获取参数为单击事件加双击参数
      query_bak = click_query_bak;
      para_record_all = para_record_all + "$d";
      that.query = el_bak ? query_bak : '';
      dbclick_store = setTimeout(function (e: any) {
          license_k = 0;
      }, 200);
    }
  } catch (e) {
    //碰到问题重置 license_k，如果license_k锁住了一直是1后面就不能用了。
    license_k = 0;
  } finally{
    return that.query 
  }
}

function doElementsOverlap(element1: HTMLElement, element2: HTMLElement): boolean {
  // 获取元素1的位置和尺寸
  const rect1 = element1.getBoundingClientRect();
  const x1 = rect1.left;
  const y1 = rect1.top;
  const width1 = rect1.width;
  const height1 = rect1.height;

  // 获取元素2的位置和尺寸
  const rect2 = element2.getBoundingClientRect();
  const x2 = rect2.left;
  const y2 = rect2.top;
  const width2 = rect2.width;
  const height2 = rect2.height;

  // 计算两个矩形的边界
  const right1 = x1 + width1;
  const bottom1 = y1 + height1;
  const right2 = x2 + width2;
  const bottom2 = y2 + height2;

  // 检查两个矩形是否重叠
  const noOverlap = (
      right1 < x2 || // rect1 在 rect2 的左边
      x1 > right2 || // rect1 在 rect2 的右边
      bottom1 < y2 || // rect1 在 rect2 的上面
      y1 > bottom2    // rect1 在 rect2 的下面
  );

  return !noOverlap; // 如果没有重叠返回 false，否则返回 true
}

function filterTableElement(xpath_table: string): boolean {
  //若组件以table开头且不以fieldid结尾，则认为无效xpath
  if(tableContainRegexes.test(xpath_table)){
    return tableTailRegexes.test(xpath_table);
  }else if(reportTableRegexes.test(xpath_table)){
    return false;
  }else{
    return true;
  }
}

function validXpath(xpath_str: string): string | null {
  //去掉xpath中的不需要检测的字符串
  xpath_str = xpath_str.includes(removeFieldidStr)?xpath_str.replace(removeFieldidStr,''):xpath_str;
  //xpath中不包含fieldid
  if(!xpath_str.includes('fieldid')){
    return '缺少fieldid标记';
  //xpath中包含以下划线开头的fieldid
  }else if(xpath_str.includes('@fieldid="_')){
    return '以"_"开头的fieldid，缺少变量值';
  //xpath中包含以undefined开头的fieldid
  }else if(xpath_str.includes('@fieldid="undefined')){
    return '以"undefined"开头的fieldid，缺少变量值';
  //用正则表达式检验xpath是否缺乏域性布局fieldid，即validRegexes中所有正则表达式xpaht都匹配不上，则判断存在问题
  }else if(!validRegexes.some(regex => regex.test(xpath_str))){
    return "缺乏区域性布局fieldid如：search-area、***_area、***_form-area等"
  //校验条件都通过，则返回null，代表校验通过
  }else{
    return null;
  }
}

//根据xpath查询当前页面有多少元素匹配
function findElementsByXPath(xpathExpression: string): number {
  // 从main_iframe外内查询
  let result = document.evaluate(
    xpathExpression,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  // 获取匹配元素的数量
  let count = result.snapshotLength;
  // 从main_iframe内查询
  let iframe_count = 0
  let iframes = Array.from(document.querySelectorAll('.nc-watermark')).filter((mainEl): mainEl is HTMLElement => mainEl instanceof HTMLElement && mainEl.style.display === 'block');
  if (iframes.length === 1){
    let iframeContent=document;
    let mainIframe = iframes[0].querySelector('[fieldid="main_iframe"]') as HTMLIFrameElement | null;
    if(mainIframe instanceof HTMLIFrameElement){
      iframeContent = mainIframe.contentDocument || mainIframe.contentWindow?.document || iframeContent;
    }
    let iframeResult = iframeContent.evaluate(
      xpathExpression,
      iframeContent,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    iframe_count = iframeResult.snapshotLength;
  }
  return count+iframe_count;
}

/**
 * 给当前页面所有元素添加动作监听事件
 */
ncc.show_bar.prototype.add_core_license = function (node: Node | null) {
  var that = this;
  function impl(nodeImpl: Node | null) {
    
    // DOM 绑定点击与双击事件
    document.addEventListener('mousedown', that.bound_mouse_move);
    document.addEventListener('mouseup', that.bound_mouse_move_4);
    document.addEventListener('dblclick', that.bound_mouse_move_2);
    document.addEventListener('keydown', that.bound_handle_keydown);
    document.addEventListener('contextmenu', that.bound_handle_contextmenu, true);
    try {
      try {
        // DOM 绑定点击与双击事件
        const mainiframe = document.getElementById('mainiframe') as HTMLIFrameElement;
        if (mainiframe && mainiframe.contentWindow && mainiframe.contentWindow.document) {
          mainiframe.contentWindow.document.addEventListener('mousedown', that.bound_mouse_move_1);
          mainiframe.contentWindow.document.addEventListener('mouseup', that.bound_mouse_move_5);
          mainiframe.contentWindow.document.addEventListener('dblclick', that.bound_mouse_move_3);
          mainiframe.contentWindow.document.addEventListener('keydown', that.bound_handle_keydown);
          mainiframe.contentWindow.document.addEventListener('contextmenu', that.bound_handle_contextmenu, true);
        }
      } catch (e) {
        // No main-iframe，静默处理
      }
      // 多 iframe 嵌套逻辑，目前支持两层
      var a: NodeListOf<HTMLIFrameElement> | null = null;
      var b = 0;
      var c: NodeListOf<HTMLIFrameElement> | null = null;
      var d = 0;
      var k = 0;
      var k1 = 0;

      a = document.querySelectorAll('iframe');
      b = a.length;

      if (b > 1) {
        while (true) {
          const iframe = a[k];
          if (iframe && iframe.getAttribute('fieldid') != null) {
            // 2024.7.25 内部页签 iframe 标记处理
            try {
              const contentWindow = iframe.contentWindow;
              if (contentWindow && contentWindow.document) {
                // 为所有有 fieldid 的 iframe 绑定事件监听器
                contentWindow.document.addEventListener('mousedown', that.bound_mouse_move_1);
                contentWindow.document.addEventListener('mouseup', that.bound_mouse_move_5);
                contentWindow.document.addEventListener('dblclick', that.bound_mouse_move_3);
                contentWindow.document.addEventListener('keydown', that.bound_handle_keydown);
                contentWindow.document.addEventListener('contextmenu', that.bound_handle_contextmenu, true);
                c = contentWindow.document.querySelectorAll('iframe');
                d = c.length;
                // 二层嵌套开始
                if (d > 0) {
                  k1 = 0;
                  while (true) {
                    const nestedIframe = c[k1];
                    if (nestedIframe && nestedIframe.getAttribute('fieldid') != null) {
                      try {
                        const nestedContentWindow = nestedIframe.contentWindow;
                        if (nestedContentWindow && nestedContentWindow.document) {
                          nestedContentWindow.document.addEventListener('mousedown', that.bound_mouse_move_1);
                          nestedContentWindow.document.addEventListener('mouseup', that.bound_mouse_move_5);
                          nestedContentWindow.document.addEventListener('dblclick', that.bound_mouse_move_3);
                          nestedContentWindow.document.addEventListener('keydown', that.bound_handle_keydown);
                          nestedContentWindow.document.addEventListener('contextmenu', that.bound_handle_contextmenu, true);
                        }
                      } catch (e) {
                        // Failed to bind events to nested iframe，静默处理
                      }
                    }
                    k1 = k1 + 1;
                    if (k1 >= d) {
                      break;
                    }
                  }
                }
                // 二层嵌套结束
              }
            } catch (e) {
              // Failed to access iframe contentWindow，静默处理
            }
          }
          k = k + 1;
          if (k >= b) {
            break;
          }
        }
      }
    } catch (e) {
      // Error，静默处理
    }
    logXPaths(nodeImpl);
  }
  window.setTimeout(() => {
    impl(node)
    //重新初始化侧边栏
    
  }, 350);
};

/**
 * 计算元素的 XPath
 */
/**
 * 检查单个元素是否有滚动条
 * @param el 要检查的HTML元素
 * @returns 如果是滚动条元素返回true，否则返回false
 */
function checkElementScrollable(el: HTMLElement): boolean {
  'use strict';
  return checkElementXScrollable(el) || checkElementYScrollable(el);
}

/**
 * 检查元素是否在页面中可见
 * @param el 要检查的HTML元素
 * @returns 如果元素可见返回true，否则返回false
 */
function isElementVisibleInViewport(el: HTMLElement): boolean {
  'use strict';
  try {
    // 首先检查基本的可见性属性
    if (!isElementVisible(el)) {
      return false;
    }

    // 检查元素是否在视口中可见（使用 getBoundingClientRect）
    const rect = el.getBoundingClientRect();
    const win = (el.ownerDocument?.defaultView || window) as Window;
    
    // 检查元素是否在视口范围内（至少有一部分可见）
    const isInViewport = (
      rect.top < win.innerHeight &&
      rect.bottom > 0 &&
      rect.left < win.innerWidth &&
      rect.right > 0
    );

    // 检查元素是否有实际尺寸
    const hasSize = rect.width > 0 && rect.height > 0;

    // 检查元素是否被其他元素遮挡（通过 offsetParent）
    // 如果 offsetParent 为 null，说明元素或其父元素被设置为 display: none
    const hasOffsetParent = el.offsetParent !== null || 
      (win.getComputedStyle(el).position === 'fixed');

    return isInViewport && hasSize && hasOffsetParent;
  } catch (e) {
    // 跨域或访问受限，返回false
    return false;
  }
}

/**
 * 检查单个元素是否有水平滚动条
 * @param el 要检查的HTML元素
 * @returns 如果有水平滚动条返回true，否则返回false
 */
function checkElementXScrollable(el: HTMLElement): boolean {
  'use strict';
  try {
    // 获取正确的 window 对象
    const win = (el.ownerDocument?.defaultView || window) as Window;
    const style = win.getComputedStyle(el);
    const overflowX = style.overflowX;
    
    const hasHorizontalScroll =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth;

    return hasHorizontalScroll;
  } catch (e) {
    // 跨域或访问受限，返回false
    return false;
  }
}

/**
 * 检查单个元素是否有垂直滚动条
 * @param el 要检查的HTML元素
 * @returns 如果有垂直滚动条返回true，否则返回false
 */
function checkElementYScrollable(el: HTMLElement): boolean {
  'use strict';
  try {
    // 首先检查元素是否在页面中可见
    if (!isElementVisibleInViewport(el)) {
      return false;
    }

    // 获取正确的 window 对象
    const win = (el.ownerDocument?.defaultView || window) as Window;
    const style = win.getComputedStyle(el);
    const overflowY = style.overflowY;
    
    const hasVerticalScroll =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight;

    return hasVerticalScroll;
  } catch (e) {
    // 跨域或访问受限，返回false
    return false;
  }
}

function logXPaths(node: Node | null): void {
  try {
    // 根据标签的fielid属性筛选出要扫描的元素以及子元素
    let actived_contents = node ? [node] : Array.from(document.querySelectorAll('[fieldid="microapp-content-actived"]'));
    // 遍历去重获取所有子元素对象集合set
    const elements = getAllVisibleElements(actived_contents)
    for (const element of elements) {
      //检查每个element是不是滚动条元素
      const isXScrollable = checkElementXScrollable(element as HTMLElement);
      const isYScrollable = checkElementYScrollable(element as HTMLElement);
      if (isXScrollable) {
        xscrollableElements.add(element as HTMLElement);
      }
      if (isYScrollable) {
        yscrollableElements.add(element as HTMLElement);
      }
    }
  } catch (error) {
    // 处理错误，静默处理
  }
}

function getAllVisibleElements(nodes: Node | Node[] | NodeListOf<Element>) {
  'use strict';
  //创建集合存储去重后的所有元素以及子元素集合
  const elements = new Set<Element>();
  // 将输入转换为数组
  const nodeArray = Array.isArray(nodes) || nodes instanceof NodeList ? Array.from(nodes) : [nodes];
  
  //定义递归扫描函数
  function traverse(node: Node): void {
    // 只有元素节点才需要处理
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    
    const el = node as HTMLElement;
    
    if(isElementVisible(el)){
      //如果是iframe元素需要取其body元素，再进行扫描
      if('iframe' === el.tagName.toLowerCase()){
        const iframe = el as HTMLIFrameElement;
        try {
          //兼容chrome浏览器版本，高版本用node.contentDocument.body，低版本用node.contentWindow.document.body
          const iframeBody = iframe.contentDocument?.body || iframe.contentWindow?.document?.body;
          if (iframeBody) {
            traverse(iframeBody);
            return;
          }
        } catch (e) {
          // 跨域iframe，无法访问，静默处理
          return;
        }
      }
      // 如果当前节点是元素节点并且不是工具栏插件且不是<style>、<script>等类型则添加到列表中
      if (el.getAttribute("id")!=="ncc-bar" && !['style', 'script','symbol','path','svg',"source","img","body"].includes(el.tagName.toLowerCase())) {
        elements.add(el);
      }
      // 当前节点存在子元素时，遍历当前节点的所有子节点
      if(el.childNodes.length>0){
        for (let i = 0; i < el.childNodes.length; i++) {
          const childNode = el.childNodes[i];
          // 如果子节点是元素节点，则递归遍历
          if (childNode.nodeType === Node.ELEMENT_NODE) {
              traverse(childNode);
          }
        }
      }
    }
  }
  //遍历每个传入的元素节点，对每个节点的子元素进行递归扫描
  for(let i = 0; i < nodeArray.length; i++ ){
    //调用递归函数
    traverse(nodeArray[i]);
  }
  return elements;
}

function isElementVisible(el: HTMLElement): boolean {
  'use strict';
  const classAttr = el.getAttribute('class') || '';
  if (el.style.display === 'none' || el.style.visibility === 'hidden' || classAttr.includes('hidden') || classAttr.includes('nc-workbench-drawer') || classAttr.includes('ant-badge-count')) {
    return false;
  }
  return true;
}

//生成xpath方法参数el为Element类型
function get_xpath(el: any, way: string): string {
  /**
   * 局部变量
   */
  //记录元素名，如果此处报错，可能为新的iframe未支持
  var el_name = el.tagName.toLowerCase();
  //存储最终生成的xpath
  var query = ''; 
  var index = 0; //元素索引记录值
  //参数相关记录变量
  var para_record = ""; //xpath参数记录，局部变量
  var text_record = ""; //text获取记录
  var window_record = ""; //窗口名记录
  var input_clear = 0; //是否清空input，如果是1，清空input
  var dblclick_record = 0; //双击事件记录，默认0是单击
  //重置变量【之前没重置，导致上一个对下一个有影响】
  var repeat_r = ""; //连续重复标记检测
  repeat_r_all = repeat_r;
  var table_r = 0; //表格标记、控件记录
  table_r_all = table_r;
  var subbtn_r = 0; //如果已经有了_sub-btn，后续就不省略了
  subbtn_r_all = subbtn_r;
  var tree_r = 0; //树标记、控件记录
  tree_r_all = tree_r;
  var li_node = 0; //li节点记录
  li_node_all = li_node;
  var class_tree_node = 0; //class树记录
  class_tree_node_all = class_tree_node;
  var table_body_r = 0; //table-body-out或inner只记录一个
  table_body_r_all = table_body_r;
  var mousemove_r = 0; //需要单独+鼠标移动的控件，1为需要
  mousemove_r_all = mousemove_r;
  var mouse_button = 0; //0为左键，2为右键，1为滑轮。
  mouse_button = mouse_button_all;
  var input_disabled = 0; //判断input是否包含disabled属性，1是包含
  input_disabled_all = input_disabled;
  var esc_record = 0; //键盘esc退出操作，1代表加上该动作
  esc_record_all = esc_record;
  var text_display = ""; //用于插件的值里显示文本内容
  text_display_all = text_display;
  //辅助xpath生成规则变量
  //记录是否已经过了根节点的检测，1是已过
  var r = 0; 
  //el初始值
  let elbak = el;

  //记录窗口名
  if (way == 'i' && document.title != null) {
      window_record = '%i' + document.title + '%i';
  } else if (way == 'w' && document.title != null) {
      window_record = '%w' + document.title + '%w';
  } else if (way == 'uw' && document.title != null) {
      window_record = '%w' + document.title + '%w';
      way = 'w';
  } else if (way == 'ui' && document.title != null) {
      window_record = '%i' + document.title + '%i';
      way = 'i';
  } else if (way == 'di' && document.title != null) {
      window_record = '%i' + document.title + '%i';
      dblclick_record = 1;
      way = 'i';
  } else if (way == 'dw' && document.title != null) {
      window_record = '%w' + document.title + '%w';
      dblclick_record = 1;
      way = 'w';
  }

  //③记录窗口框架名
  para_record = window_record;

  //④记录输入值
  //!=null代表不是null也不是undefined
  if (input_k_all == 1 && input_record_all != null && input_record_all.value != null && input_record_all.value != "") {
      para_record = para_record + '%s' + input_record_all.value + '%s';
  } else if (input_k_all == 1 && input_start_all == 1 && input_record_all != null && input_record_all.value == "") {
      input_clear = 1;
  }

  //非检查模式，重置上一次存储的input的值
  input_k_all = 0;
  input_start_all = 0;
  //生成xpath代码
  for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
    el_name = el.tagName.toLowerCase();
    //元素索引记录值重置
    index = 0;
    if (el_name == 'tr') {
      //tr元素获取索引，会获取所有当前元素前的tr
      index = el.sectionRowIndex + 1;
    } else if (el_name == 'td') {
      //tr元素获取索引
      index = el.cellIndex + 1;
    } else {
      //其它类型元素获取索引
      index = get_element_index(el);
    }
    try {
      //定义 fieldid_record为 获取到 fieldid 的值
      var fieldid_record = el.getAttribute("fieldid");
      if (r == 0) {
          //提取text文本
          text_record = text_xpath(el);
          text_display_all = text_record;
      }
      //fieldid标记检测
      //优先检查fieldid
      if (fieldid_record != null) {
          //检测fieldid功能
          var fieldid_result = fieldid_xpath(el, query, fieldid_record, el_name, way, index, r, text_record);
          r = 1;
          if (fieldid_result != "true") {
              query = fieldid_result;
    
          } else {
              continue;
          }
      //没有fieldid情况下最后一个节点的处理
      //通过 r 来判断是否为第一次
      } else if (r == 0) {
          r = 1;
          if (el_name == "div" || el_name == "span" || el_name == "li" || el_name == 'button' || el_name == 'a' || el_name == 'i' || el_name == 'p' || el_name == 'h1' || el_name == 'h2' || el_name == 'h3' || el_name == 'label') {
            //尾部class类处理
            var class_result1 = class_xpath_tail(el, query, el_name, text_record);
            if (class_result1 != "true") {
                query = class_result1;
            } else if (class_result1 == "true") {
                continue;
            }
          //输入逻辑检测
          //input、textarea输入类标签检测，单选、多选框加上类型属性
          } else if (el_name == 'input' || el_name == 'textarea') {

              //input、textarea记录
              input_record_all = el;
              input_k_all = 1;

              //记录input的初始值，如果初始值是空的，就不用清空动作了。
              if (el.value == "" || el.value == null) {
                  input_start_all = 0;
              } else {
                  input_start_all = 1;
              }
              var class_record = el.getAttribute("class");
              var type_record = el.getAttribute("type");

              //#2 树形查询输入框的检测
              if (class_record != null && class_record.indexOf("refer-input") != -1) {
                  query = '//' + el_name + '[contains(@class,"refer-input")]' + query;

                  //#3 input类型radio、checkbok的type类型检测
              } else if (type_record == 'radio' || type_record == 'checkbox') {
                  query = '//' + el_name + '[@type="' + type_record + '"]' + query;
              } else {
                  query = '//' + el_name + query;
              }
              //----- 报表类td的特殊处理
              //当结尾是td时把td显示出来，有索引的加上索引
          } else if (el_name == 'td') {
            if (index > 1 && text_record != "") {
              query = '//' + el_name + '[' + index + '][text()="' + text_record + '"]' + query;
            } else if (index > 1) {
              query = '//' + el_name + '[' + index + ']' + query;
            } else if (index == 1) {
              query = '//' + el_name + query;
            }
            //------ 结尾元素索引逻辑检测
            //当结尾是包含索引的显示出来
        } else if (index > 1) {
          query = '//' + el_name + '[' + index + ']' + query;
        }
        //----- 结尾显示元素名定义
        //当结尾元素是button、image、li元素没有属性的显示出来
        //2022.04.25 菲姐需求，去掉li元素显示 || el_name == "li"
        if (query == "" && (el_name == "button" || el_name == "img")) {
          query = '//' + el_name;
        } else if (el_name == "image" && "svg" == el.parentNode.tagName.toLowerCase()) {
          query = '//*[name()="' + el_name + '"]';
        }
        //第二次及以上处理
      } else {
        if (r == 0) {
          text_display_all = "注意：你点击了空白区域！";
        }
        //#7 表格类通过tr来判断行数
        if (el_name == 'tr') {
          //#77 tr展开行加一层class
          if (el.getAttribute("class") != null && el.getAttribute("class").indexOf("expanded-row") != -1) {
            if (index > 1) {
                //未使用 tr_index = index;
                query = '//tr[' + index + '][contains(@class,"expanded-row")]' + query;
            } else {
                query = '//tr[contains(@class,"expanded-row")]' + query;
            }
          } else if (index > 1) {
            if (reference_control_all && el_name == 'tr' && query.indexOf("text()") != -1) {
                query = '//' + el_name + query;
            } else {
                query = '//' + el_name + '[' + index + ']' + query;
            }
          } else if (index == 1) {
            query = '//' + el_name + query;
          }
        } else if (el.getAttribute("class") != null) {
          //引用标准class处理函数
          var class_result2 = class_xpath(el, el_name, query);
          if (class_result2 != "true") {
            query = class_result2;
          } else if (class_result2 == "true") {
            continue;
          }
        }
        //#75 表格类检测到table，增加上
        if (el_name == "table") {
          query = '//table' + query;
        }
      }
      if(query != null){
        //2022.04.25 菲姐需求，指定标记后停止抓取，共9条
        if(query.indexOf('//*[@fieldid="') != -1 && query.indexOf('_modal-area"')!= -1){
          break;
        }else if(query.indexOf('//*[@fieldid="stairs-area"]') != -1){
          break;
        }else if(query.indexOf('//*[@fieldid="tips-window"]') != -1){
          break;
        }else if(query.indexOf('//*[@fieldid="nav-group"]') != -1){
          break;
        }else if(query.indexOf('//*[@fieldid="settings-area"]') != -1){
          break;
        }else if(query.indexOf('//*[@fieldid="') != -1 && query.indexOf('_refer-window" and contains(@style,"flex")]')!= -1){
          break;
        }else if(query.indexOf('//*[@fieldid="') != -1 && query.indexOf('_list" and not(contains(@class,"hidden"))]')!= -1){
          break;
        }else if(query.indexOf('//*[contains(@class,"fieldid_') != -1 && query.indexOf('_calendar")]')!= -1){
          break;
        }else if(query.indexOf('//*[contains(@class,"fieldid_') != -1 && query.indexOf('_list") and not(contains(@class,"hidden"))]')!= -1){
          break;
        }
      }
    } catch (e) {
        // 处理异常，静默处理
    }
  }
  //异常参数处理【没啥用】
  if (para_record == 'undefined' || para_record == null) {
      para_record = "";
  }
  //②补加 text 文本信息
  if (text_record != "") {
      para_record = '%t' + text_record + '%t' + para_record;
  }
  //①补加 xpath 标记
  para_record = '%f' + para_record;
  //⑤补加 mousemove 标记
  if (mousemove_r_all == 1) {
      para_record = para_record + '$$';
  }
  //⑥补加 鼠标右键点击 标记
  if (("" + mouse_button) == "2") {
      para_record = para_record + '$@';
  }
  //⑦补加 清空 标记
  if (input_clear == 1) {
      para_record = para_record + '$!';
  }
  //⑧补加 input为disabled类型 标记
  if (input_disabled_all == 1) {
      para_record = para_record + '$&';
  }
  //⑨补加 input为disabled类型 标记
  if (esc_record_all == 1) {
      para_record = para_record + '$%';
  }
  //10 补加 双击动作 标记
  if (dblclick_record == 1) {
      para_record = para_record + '$d';
  }
  //传入全局变量
  para_record_all = para_record;

  //下拉框点到空白处，无法确定时哪个下拉框，而且没有文本筛选，需要遍历子元素获得下拉框文本
  if(query.endsWith('_select") and not(contains(@class,"hidden"))]')){
    query = query + get_children_text(elbak);
  }
  return query;
}

function get_children_text(el:HTMLElement){
  let children_text = "";
  try {
    // 递归函数，遍历所有子节点
    function findTextInNode(node: Node): string {
      // 跳过注释节点
      if (node.nodeName == "#comment") {
        return "";
      }
      // 检查当前节点的文本值
      let text_record2 = node.nodeValue;
      if (text_record2 != null && text_record2 != "" && text_record2 != " ") {
        // 检测文本里有回车符号，跳过或检测文本里只有空格，跳过，这个空格不是随便打出来的，是&nbsp;的展现，复制出来的。
        if (text_record2.indexOf("\n") != -1 || text_record2 == " ") {
          // 文本无效，继续检查子节点
          
        } else {
          // 找到有效文本，直接返回
          return text_record2;
        }
      }
      
      // 如果当前节点没有有效文本，递归检查所有子节点
      if (node.childNodes && node.childNodes.length > 0) {
        for (var i = 0; i < node.childNodes.length; i++) {
          const result = findTextInNode(node.childNodes[i]);
          if (result != "") {
            return result;
          }
        }
      }
      
      return "";
    }
    
    // 从传入的元素开始递归查找
    if (el.childNodes.length > 0) {
      for (var i = 0; i < el.childNodes.length; i++) {
        children_text = findTextInNode(el.childNodes[i]);
        if (children_text != "") {
          break;
        }
      }
    }
  } catch (e) {
    children_text = "";
  } finally {
    if (children_text.length > 0){
      children_text = `//*[text()="${children_text}"]`;
    }
    return children_text;
  }
}
//区域标记路径处理
function fieldid_xpath(el:any, query:string, fieldid_record:string, el_name:string, way:string, index:number, r:number, text_record:string) {
	//获取class
  var class_record = el.getAttribute("class");
	if(class_record == null){
		class_record = "";
	}
  //xpath参数生成
  var component = "";
  //input、textarea记录
  if (el_name == 'input' || el_name == 'textarea') {
    input_record_all = el;
    input_k_all = 1;
    //记录input的初始值，如果初始值是空的，就不用清空动作了。
    if (el.value == "" || el.value == null) {
      input_start_all = 0;
    } else {
      input_start_all = 1;
    }
  }
  //#17 连续重复标记检测并过滤
  if (repeat_r_all == fieldid_record) {
    if (query.indexOf('input[@fieldid="' + fieldid_record + '"]') != -1) {
      const mInput = query.match("input");
      if (mInput && mInput.index != null) {
        query = query.substring(0, mInput.index + 5);
      }
    } else if (query.indexOf('img[@fieldid="' + fieldid_record + '"]') != -1) {
      const mImg = query.match("img");
      if (mImg && mImg.index != null) {
        query = query.substring(0, mImg.index + 3);
      }
    } else {
      return "true";
    }
  }
  repeat_r_all = fieldid_record;
  //#8 Btn、_btn、_sub-btn类型后面不要有内容
  if (fieldid_record.slice(-8) == '_sub-btn') {
    query = "";
    subbtn_r_all = 1;
  } else if (fieldid_record.slice(-3) == 'Btn' || fieldid_record.slice(-4) == '_btn') {
    if (subbtn_r_all == 0) {
        query = "";
    }
  }
  //#15 树区域、控件标记同时存在，只保留树控件标记
  if (fieldid_record.slice(-5) == '_tree') {
    tree_r_all = 1;
  }
  if (fieldid_record.slice(-10) == '_tree-area' && tree_r_all == 1) {
    tree_r_all = 0;
    return "true";
  }
  //#16 表格区域、控件标记同时存在，只保留表格控件标记
  if (fieldid_record.slice(-6) == '_table') {
    table_r_all = 1;
		//2022.04.18 表格下如果为标准提取模式，去掉里面的text文本信息。
		if (!reference_control_all ) {
      const mText = query.match("//\\*\\[text\\(\\)=");
      if (mText && mText.index != null) {
        query = query.substring(0, mText.index);
      }
    }
  }
  if (fieldid_record.slice(-11) == '_table-area' && table_r_all == 1) {
    table_r_all = 0;
    return "true";
  }
  //#11 提示类可变fieldid的检测
  if (fieldid_record.indexOf("_modal-area") != -1 && fieldid_record.indexOf(".") != -1) {
    component = '[contains(@fieldid,"_modal-area")]';
  //#12 title类可变fieldid的检测
  } else if (fieldid_record.indexOf("_title") != -1 && fieldid_record.indexOf("${") != -1) {
    component = '[contains(@fieldid,"_title")]';
  //#13 单表类型输入框，如果有false类的话，fieldid基础上增加false类
  } else if (el.getAttribute("class") == 'false') {
    component = '[@fieldid="' + fieldid_record + '"]' //+ '" and @class="false"]';
    mousemove_r_all = 1;
  } else if (el_name == 'li' && fieldid_record.slice(-5) == "_node") {
    if (li_node_all == 0) {
      if (query.indexOf("icon-") != -1) {
        mousemove_r_all = 1;
      }
      li_node_all = 1;
      //2021.10.29处理，tree-title标记下包含文本，去掉文本
      var tree_key = '//*[@fieldid="tree-title"]';
      if (query.indexOf(tree_key) != -1 && query.indexOf("*[text()=") != -1) {
        if (query.substring(0, tree_key.length) == tree_key) {
          query = tree_key;
        }
      }
			//2022.04.14 点击空白默认显示//a，共两处
			if (query == "") {
        query = "//a"; 
      }
      component = '[@fieldid="' + fieldid_record + '"]';
     }
  } else if (fieldid_record.indexOf("_list_item") != -1 && el.parentNode.getAttribute("class") != null && el.parentNode.getAttribute("class").indexOf("message-list-box") != -1 && index > 1) {
    component = '[' + index + '][@fieldid="' + fieldid_record + '"]';
    //2022.04.18 声明：原来该参数只处理标记和文本处于同级的结构，现在都支持了。
    //没有匹配特殊处理规则默认取全值，第一次
    //2022.09.22 之前为了解决参照列表不显示文本，把其它标记的文本也去掉了。目前进行修复，取refer-td标志
  } else if (reference_control_all && r == 0 && text_record != "" && class_record.indexOf("refer-td") != -1) {
    //2022.08.17 修改提取文本时只显示文本，不同时显示fieldid结构了，以应对易变的结构
    //component = '[@fieldid="' + fieldid_record + '" and text()="' + text_record + '"]';
    component = '[text()="' + text_record + '"]';
    //2022.04.18 userlogo后去掉文本
	} else if (fieldid_record.indexOf("userlogo") != -1){
		if (query == "" || query.indexOf("*[text()=") != -1) {
			query = "";
		}
		component = '[@fieldid="' + fieldid_record + '"]';
    //2023.04.27 去掉disable，影响分析，实际用不到 and not(@disable)
    //2022.08.22 button添加disable属性
	} else if (el_name == "button"){
		component = '[@fieldid="' + fieldid_record + '"]';
	//2024.06.11 BIP添加文本特殊处理
	} else if (fieldid_record.indexOf("|") != -1 && text_record != "" && query == "" && reference_control_all){
		component = '[@fieldid="' + fieldid_record + '"][text()="' + text_record + '"]';
    //没有匹配特殊处理规则默认取全值，非第一次
  } else {
      component = '[@fieldid="' + fieldid_record + '"]';
  }
	//2022.04.15 button按钮显示
  if (el_name == "input" || el_name == "img" || el_name == "textarea" || el_name == "image" || el_name == "button") {
      component = el_name + component;
      //} else if(el_name == "image" &&  "svg" == el.parentNode.tagName.toLowerCase()){
      //component = '*[name()="' + el_name + '"]';
  } else {
      component = "*" + component;
  }
  //报表里tr大于10进行特殊处理，针对tr。
  if (fieldid_record == 'report-area') {
    const mTr = query.match(/\/\/tr\[/);
    if (mTr && mTr.index != null) {
      var query1 = query.substring(0, mTr.index);
      var query2 = "";
      var int_cut = 0;
      var text_cut_tr = query.substring(mTr.index + 5);
      const idxEndTr = text_cut_tr.indexOf("]");
      if (idxEndTr !== -1) {
        query2 = text_cut_tr.substring(idxEndTr);
        text_cut_tr = text_cut_tr.substring(0, idxEndTr);
      }
      int_cut = parseInt(text_cut_tr) - 1;
      //2020.11.9号，报表节点抓出来的数据错位，调整处理
      query = query1 + '//tr[' + (int_cut + 1) + query2;
    }
  }
  //报表里td大于10进行特殊处理，针对td。
  if (fieldid_record == 'report-area') {
    const mTd = query.match(/\/\/td\[/);
    if (mTd && mTd.index != null) {
      var query_td1 = query.substring(0, mTd.index);
      var query_td2 = "";
      var int_cut_td = 0;
      var text_cut_td = query.substring(mTd.index + 5);
      const idxEndTd = text_cut_td.indexOf("]");
      if (idxEndTd !== -1) {
          query_td2 = text_cut_td.substring(idxEndTd);
          text_cut_td = text_cut_td.substring(0, idxEndTd);
      }
      int_cut_td = parseInt(text_cut_td) - 1;
      query = query_td1 + '//td[' + int_cut_td + query_td2;
    }
  }
  //重复弹窗特殊处理【模态框】
  if (component.match("_modal-area") != null) {
    var n = 0;
    var xpath1 = "//" + component + query;
    query = '//' + component.substring(0, component.length - 1) + ' and not(contains(@style,"none"))]' + query;
    //重复弹窗特殊处理【参照弹框】
  } else if (component.match("_refer-window") != null) {
    var n_2 = 0;
    var xpath2 = "//" + component + query;
    var style_value = el.getAttribute("style");

    if (style_value.match("flex") != null) {
        query = '//' + component.substring(0, component.length - 1) + ' and contains(@style,"flex")]' + query;
    } else {
        query = '//' + component + query;
    }
    //_select和_btn_list结尾的特殊处理
  } else if (component.match("_select") != null || component.match("_btn_list") != null) {
    query = '//' + component.substring(0, component.length - 1) + ' and not(contains(@class,"hidden"))]' + query;
    //常规生成路径
  } else if (component != "*") {
    query = '//' + component + query;
  }
  return query;
}
//文本提取处理
function text_xpath(el:any) {
	var text_record = "";
  try {
    var text_record2 = "";
    if (el.childNodes.length > 0) {
      for(var i=0;i < el.childNodes.length; i++){
        //跳过注释内容
        if(el.childNodes[i].nodeName == "#comment"){
          continue;
        }				
        text_record2 = el.childNodes[i].nodeValue;
        if (text_record2 != null && text_record2 != "" && text_record2 != " ") {
          //检测文本里有回车符号，跳过或检测文本里只有空格，跳过，这个空格不是随便打出来的，是&nbsp;的展现，复制出来的。
          if(text_record2.indexOf("\n") != -1 || text_record2 == " "){
            continue
          }
          text_record = text_record2;
          break;
        }
      }
    }
  } catch (e) {
    text_record = "";
  }
  return text_record;
}
//获得索引
function get_element_index(el:any) {
  var index = 1; //初始为1
  var sib;
  for (sib = el.previousSibling; sib; sib = sib.previousSibling) {
      if (sib.nodeType === Node.ELEMENT_NODE && elementsShareFamily(el, sib)) {
          index++;
      }
  }
  if (index > 1) {
      return index;
  }
  for (sib = el.nextSibling; sib; sib = sib.nextSibling) {
      if (sib.nodeType === Node.ELEMENT_NODE && elementsShareFamily(el, sib)) {
          return 1;
      }
  }
  return 0;
}
function elementsShareFamily(primary_el:any, sibling_el:any) {
  var p = primary_el,
  s = sibling_el;
  return (p.tagName === s.tagName && (!p.className || p.className === s.className) && (!p.id || p.id === s.id));
}
//尾部class类处理
function class_xpath_tail(el:any, query:string, el_name:string, text_record:string) {
  //获取class
  var class_record = el.getAttribute("class");
	if(class_record == null){
		class_record = "";
	}
  //菜单退出处理
  if (class_record == "ant-drawer-mask") {
      esc_record_all = 1;
  }
	//2022.08.31 适配部分下拉框内容常规text匹配到隐藏内容的问题
  if (class_record.indexOf("wui-select-item-option-content") != -1 && text_record != "" && text_record != null) {
    query = '//*[contains(@class,"wui-select") and text()="' + text_record + '"]' + query;	
	//参照为点开时，获取文本比图标优先，修改图标优先级大于文本。2020-11-10 菲姐新增需求，包括-icon, icon-, uf-, -uf
  } else if (text_record != "" && text_record != null && (class_record == null || class_record.indexOf("-icon") == -1 && class_record.indexOf("icon-") == -1 && class_record.indexOf("-uf") == -1 && class_record.indexOf("-uf") == -1)) {
    //函数的优先取class
    if (text_record == "fx" && class_record.indexOf("refer-function") != -1) {
      query = '//*[contains(@class,"refer-function")]' + query;
		//菜单项优先展示class+文本 2023.2.15
		} else if (class_record.indexOf("item-app") != -1){
			if(x('//*[@fieldid="nav-node"]//*[text()="' + text_record + '"]')>1){
				query = '//*[contains(@class,"item-app") and text()="' + text_record + '"]' + query;
			}else{
				query = '//*[text()="' + text_record + '"]' + query;
			}
		//2022.9.19 bip button没有标记的先显示出来
		} else if (el_name == "button") {
      query = '//button[text()="' + text_record + '"]' + query;
    } else {
        query = '//*[text()="' + text_record + '"]' + query;
    }
  //#33 如果class_record为空，捕获
  } else if (class_record == null) {
      // no class，静默处理
  //#34 下拉参照的打开，通过class定位
  } else if (class_record == 'u-select-arrow') {
    query = '//*[@class="' + class_record + '"]' + query;
  //#31 开关的检测
  } else if (class_record.indexOf("u-switch") != -1) {
    query = '//*[contains(@class,"u-switch")]' + query;
  //#36 参照里树形勾选框的检测
  } else if (class_record.indexOf("u-tree-checkbox-inner") != -1) {
    query = '//*[contains(@class,"u-tree-checkbox")]' + query;
  //树展开、收起图标处理
  } else if (class_record.indexOf("wui-tree-") != -1 && class_record.indexOf("_open") != -1) {
    query = '//*[contains(@class,"wui-tree-") and contains(@class,"_open")]' + query;
  } else if (class_record.indexOf("wui-tree-") != -1 && class_record.indexOf("_close") != -1) {
    query = '//*[contains(@class,"wui-tree-") and contains(@class,"_close")]' + query;
  //#37 fx函数按钮的检测
  } else if (class_record.indexOf("refer-function") != -1) {
    query = '//*[contains(@class,"refer-function")]' + query;
  //图标类型的处理逻辑
  } else if (el_name == 'i' || el_name == 'span' || el_name == 'div' || el_name == 'button') {
    //图标路径处理
    query = icon_xpath(el, query, class_record);
  //#6 a标签缺少定位属性，通过title属性进行定位
  } else if (el_name == 'a' && el.getAttribute("title") != null && el.getAttribute("title") != "") {
		query = '//*[@title="' + el.getAttribute("title") + '"]' + query;
  }
  return query;
}
//标准class类处理
function class_xpath(el:any, el_name:string, query:string) {
  //辅助xpath生成规则变量
  var select_r = 0; //nc-select重复标记记录
  //获取class
  var class_record = el.getAttribute("class");
	if(class_record == null){
		class_record = "";
	}
  //#62 开始结束日期类，类里包含left和right，需要进行区分
  if (class_record.indexOf("rc-calendar-range-left") != -1) {
    query = '//*[contains(@class,"range-left")]' + query;
  } else if (class_record.indexOf("rc-calendar-range-right") != -1) {
    query = '//*[contains(@class,"range-right")]' + query;
	//2022.08.17 通过添加wui-table-body区分参照的表头表体
  } else if (class_record.indexOf('wui-table-body') != -1 && table_body_r_all == 0) {
    //2021-3-15, 左右固定列tbody的属性没有取到, 暂时放开取table-body结尾问题，会导致取不到table-body的问题。
		//2023-05-26 修复第一行变为全选的问题
		query = '//*[contains(@class,"wui-table-body")]' + query;
		//限制一次
    table_body_r_all = 1;
  } else if (class_record.indexOf('wui-table-header') != -1) {
    query = '//*[contains(@class,"wui-table-header")]' + query;
  //2022.08.17 wui-优先级高，常规还是table-body
  } else if (class_record.indexOf('table-body') != -1 && table_body_r_all == 0) {
    //特殊处理，table-body有结尾的不抓取 2020-11-10 菲姐新需求
    //2021-3-15, 左右固定列tbody的属性没有取到, 暂时放开取table-body结尾问题，会导致取不到table-body的问题。
		query = '//*[contains(@class,"table-body")]' + query;
		table_body_r_all = 1;
  } else if (class_record.indexOf('table-header') != -1) {
    query = '//*[contains(@class,"table-header")]' + query;
	//2022.09.22 增加一层class，解决高级查询输入框匹配到前面等于、介于的输入框里
  } else if (class_record.indexOf('searchAdvCom_com') != -1) {
    query = '//*[contains(@class,"searchAdvCom_com")]' + query;
  //#76 枚举增加一层class
  } else if (class_record.indexOf("nc-select") != -1) {
    if (select_r == 0) {
      select_r = 1;
      query = '//*[contains(@class,"nc-select")]' + query;
    }
	//版本分支修改2
	//2022.04.25 李欣需求，添加base-select抓取
	//2022.08.17 修改下拉抓取标记为wui-select，前面的wui-select遮挡勾选框，但是保留勾选框，防止后面结构调整。
	} else if (class_record.indexOf("wui-select-selector") != -1) {
    query = '//*[contains(@class,"wui-select")]' + query;
	} else if (class_record.indexOf("wui-select-arrow") != -1) {
    query = '//*[contains(@class,"wui-select-arrow")]' + query;
  //#78 报表增加一层class
  } else if (class_record.indexOf("ht_master") != -1) {
    query = '//*[contains(@class,"ht_master")]' + query;
  //2022.4.18 报表右键htMenu抓取不到，可能是因为控件消失过快。
  //#79 复杂报表增加一层class
  } else if (class_record.indexOf("htMenu") != -1) {
    query = '//*[contains(@class,"htMenu")]' + query;
    //#65 右上角日期增加一层class
  } else if (class_record.indexOf("fieldid_business-date_calendar") != -1) {
    query = '//*[contains(@class,"fieldid_business-date_calendar")]' + query;
  //#68 日期控件增加一层class
  } else if (class_record.indexOf("fieldid_abledate_calendar") != -1) {
    query = '//*[contains(@class,"fieldid_abledate_calendar")]' + query;
    //#69 范围日期控件增加一层class
  } else if (class_record.indexOf("fieldid_logdate_calendar") != -1) {
    query = '//*[contains(@class,"fieldid_logdate_calendar")]' + query;
  } else if (class_record.match("fieldid_") != null && class_record.match("_calendar") != null) {
    var text_cut_4 = class_record.substring(class_record.match("fieldid_").index);
    if (text_cut_4.match("_calendar") != null) {
      text_cut_4 = text_cut_4.substring(0, text_cut_4.match("_calendar").index + 9);
    }
    query = '//*[contains(@class,"' + text_cut_4 + '")]' + query;
  //#70 返回控件开始、结束框增加一层class
  } else if (class_record.indexOf("startNum") != -1) {
    query = '//*[contains(@class,"start")]' + query;
  } else if (class_record.indexOf("endNum") != -1) {
    query = '//*[contains(@class,"end")]' + query;
  } else if (class_record.indexOf("startDateTime") != -1) {
    query = '//*[contains(@class,"start")]' + query;
  } else if (class_record.indexOf("endDateTime") != -1) {
    query = '//*[contains(@class,"end")]' + query;
  //2021.10.12适配范围控件参照startRefer的start、end的提取
  } else if (class_record.indexOf("startRefer") != -1) {
    query = '//*[contains(@class,"start")]' + query;
  } else if (class_record.indexOf("endRefer") != -1) {
    query = '//*[contains(@class,"end")]' + query;
  //#71 分割按钮增加一层class
  } else if (class_record.match("fieldid_") != null && class_record.match("_btn_list") != null) {
    var text_cut_5 = class_record.substring(class_record.match("fieldid_").index);
    if (text_cut_5.match("_btn_list") != null) {
      text_cut_5 = text_cut_5.substring(0, text_cut_5.match("_btn_list").index + 9);
    }
    query = '//*[contains(@class,"' + text_cut_5 + '") and not(contains(@class,"hidden"))]' + query;
  //#72 枚举下拉框增加一层class
  } else if (class_record.match("fieldid_") != null && class_record.match("_select") != null) {
    var text_cut_6 = class_record.substring(class_record.match("fieldid_").index);
    if (text_cut_6.match("_select") != null) {
      text_cut_6 = text_cut_6.substring(0, text_cut_6.match("_select").index + 7);
    }
    query = '//*[contains(@class,"' + text_cut_6 + '") and not(contains(@class,"hidden"))]' + query;
  //#73 参照类输入框，候选词区域增加一层class
  } else if (class_record.match("fieldid_") != null && class_record.match("_refer") != null) {
    var text_cut_7 = class_record.substring(class_record.match("fieldid_").index);
    if (text_cut_7.match("_refer") != null) {
      text_cut_7 = text_cut_7.substring(0, text_cut_7.match("_refer").index + 6);
    }
    query = '//*[contains(@class,"' + text_cut_7 + '") and not(contains(@class,"hidden"))]' + query;
  //#80 参照类输入框，候选词区域增加一层class
  } else if (class_record.match("fieldid_") != null && class_record.match("_node") != null) {
    var text_cut_8 = class_record.substring(class_record.match("fieldid_").index);
    if (class_tree_node_all == 1) {
      return "true";
    } else {
      class_tree_node_all = 1;
      if (text_cut_8.match("_node") != null) {
        text_cut_8 = text_cut_8.substring(0, text_cut_8.match("_node").index + 5);
      }
			if (query == "") {
				query = "//a";
      }
      query = '//*[contains(@class,"' + text_cut_8 + '")]' + query;
    }
  //#74 只要类里包含fieldid的，增加一层class
  } else if (class_record.match("fieldid_") != null) {
    var text_cut_9 = class_record.substring(class_record.match("fieldid_").index);
    if (text_cut_9.match(" ") != null) {
        text_cut_9 = text_cut_9.substring(0, text_cut_9.match(" ").index);
    }
    query = '//*[contains(@class,"' + text_cut_9 + '")]' + query;
    //----- 参照搜索结果变红特殊处理
    //文本提取改为获取title
  } else if (el_name == 'li' && el.getAttribute("title") != null && el.getAttribute("title") != "" && el.getAttribute("title").indexOf("/") != -1) {
      query = '//*[@title="' + el.getAttribute("title") + '"]';
  //2021.10.9新增加，非尾部图标提取，专门针对首页图标提取。
  } else if (el_name == 'span' || el_name == 'div') {
      //图标路径处理
      query = icon_xpath(el, query, class_record);
  }
  return query;
}
//图标路径处理
function icon_xpath(el:any, query:string, class_record:string) {
  //表格列排序图标检测 - 特殊处理
  if (class_record.indexOf("uf-sortdown") != -1) {
    var el_parent_1;
    try {
        el_parent_1 = el.parentNode.parentNode.parentNode;
        var parent_fieldid_1 = el_parent_1.firstChild.getAttribute("fieldid");
    } catch (e) {
        // 处理异常，静默处理
    }
    if (parent_fieldid_1 != null && parent_fieldid_1 != "") {
        query = '//*[@fieldid="' + parent_fieldid_1 + '"]/..//*[contains(@class,"uf-sortdown")]' + query;
    } else {
        query = '//*[contains(@class,"uf-sortdown")]' + query;
    }
  } else if (class_record.indexOf("uf-sortup") != -1) {
    var el_parent_2;
    try {
        el_parent_2 = el.parentNode.parentNode.parentNode;
        var parent_fieldid_2 = el_parent_2.firstChild.getAttribute("fieldid")
    } catch (e) {
        // 处理异常，静默处理
    }
    if (parent_fieldid_2 != null && parent_fieldid_2 != "") {
        query = '//*[@fieldid="' + parent_fieldid_2 + '"]/..//*[contains(@class,"uf-sortup")]' + query;
    } else {
        query = '//*[contains(@class,"uf-sortup")]' + query;
    }
  } else if (class_record.indexOf("uf-symlist") != -1) {
    var el_parent_3;
    try {
        el_parent_3 = el.parentNode.parentNode.parentNode;
        var parent_fieldid_3 = el_parent_3.firstChild.getAttribute("fieldid");
    } catch (e) {
        // 处理异常，静默处理
    }
    if (parent_fieldid_3 != null && parent_fieldid_3 != "") {
        query = '//*[@fieldid="' + parent_fieldid_3 + '"]/..//*[contains(@class,"uf-symlist")]' + query;
    } else {
        query = '//*[contains(@class,"uf-symlist")]' + query;
    }
  //----- 常见图标类型检测（3种类型）
  //图标类且符合包含icon-的类检测
  } else if (class_record.match(" icon-") != null || (class_record.length > 5 && class_record.substring(0, 5) == 'icon-')) {
    const idx_cion = class_record.indexOf("icon-");
    if (idx_cion === -1) {
      return query;
    }
    var text_cut_1 = class_record.substring(idx_cion);
    const m1 = text_cut_1.match(" ");
    if (m1 && m1.index != null) {
      text_cut_1 = text_cut_1.substring(0, m1.index);
    }
    if (text_cut_1 == "icon-gerenpeizhi" || text_cut_1 == "icon-shanchu") {
        mousemove_r_all = 1;
    }
    //2020.12.24 回放工具整表编辑识别异常，去掉该标记的读取。
    query = '//*[contains(@class,"' + text_cut_1 + '")]' + query;
  //图标类且符合包含uf-的类检测
  } else if (class_record.match(" uf-") != null || (class_record.length > 3 && class_record.substring(0, 3) == 'uf-')) {
    const idx_uf = class_record.indexOf("uf-");
    if (idx_uf === -1) {
      return query;
    }
    var text_cut_3 = class_record.substring(idx_uf);
    const m3 = text_cut_3.match(" ");
    if (m3 && m3.index != null) {
      text_cut_3 = text_cut_3.substring(0, m3.index);
    }
    query = '//*[contains(@class,"' + text_cut_3 + '")]' + query;
  //2023-3-20 wui-icon会有干扰，这个不规范
  //图标类且符合包含-icon的类检测
  } else if (class_record.match("-icon ") != null || (class_record.length > 5 && class_record.slice(-5) == '-icon')) {
    const idx_icon = class_record.indexOf("-icon");
    if (idx_icon === -1) {
      return query;
    }
    var text_cut_2 = class_record.substring(0, idx_icon + 5);
    // 去掉前缀空格段
    while (true) {
      const m = text_cut_2.match(" ");
      if (m && m.index != null) {
        text_cut_2 = text_cut_2.substring(m.index + 1);
      } else {
        break;
      }
    }
    query = '//*[contains(@class,"' + text_cut_2 + '")]' + query;
  }
  return query;
}
// 校验xpath唯一性
function x(xpath:string) {
  var result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
  var i = 0;
  while (result.iterateNext()) {
      i++;
  }
  return i;
}
// 实例化
if (location.href.indexOf('acid3.acidtests.org') === -1) {
  // 如果已经存在实例，先清理旧的 iframe 和消息监听器
  if ((window as any).xhBarInstance) {
    const oldInstance = (window as any).xhBarInstance;
    // 移除旧的消息监听器
    try {
      if ((globalThis as any).chrome?.runtime?.onMessage && oldInstance.bound_handle_request) {
        (globalThis as any).chrome.runtime.onMessage.removeListener(oldInstance.bound_handle_request);
      }
    } catch (e) {
      // 静默处理错误
    }
    // 清理旧的 iframe
    if (oldInstance.bar_frame) {
      const oldFrame = document.getElementById('ncc-bar');
      if (oldFrame && oldFrame.parentNode) {
        oldFrame.parentNode.removeChild(oldFrame);
      }
    }
  }
  // 创建新实例
  (window as any).xhBarInstance = new ncc.show_bar();
  (window as any).xhBarInstance.add_core_license(null);
  
  // 页面加载完成后自动调用 refresh_observer
  if (document.readyState === 'complete') {
    // 页面已加载完成，立即调用
    setTimeout(() => {
      (window as any).xhBarInstance.refresh_observer();
    }, 100);
  } else {
    // 等待页面加载完成
    window.addEventListener('load', () => {
      setTimeout(() => {
        (window as any).xhBarInstance.refresh_observer();
      }, 100);
    }, { once: true });
  }
}
// 导出到全局，防止被清理
(window as any).ncc = ncc;