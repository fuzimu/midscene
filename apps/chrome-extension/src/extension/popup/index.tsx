/// <reference types="chrome" />
import {
  ApiOutlined,
  MenuOutlined,
  SendOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  NavActions,
  globalThemeConfig,
  useEnvConfig,
} from '@midscene/visualizer';
import { ConfigProvider, Dropdown, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { BrowserExtensionPlayground } from '../../components/playground';
import Bridge from '../bridge';
import Recorder from '../recorder';
import './index.less';
import { OPENAI_API_KEY } from '@midscene/shared/env';
import { safeOverrideAIConfig } from '@midscene/visualizer';
import {
  ChromeExtensionProxyPage,
  ChromeExtensionProxyPageAgent,
} from '@midscene/web/chrome-extension';
// remember to destroy the agent when the tab is destroyed: agent.page.destroy()
const extensionAgentForTab = (forceSameTabNavigation = true) => {
  const page = new ChromeExtensionProxyPage(forceSameTabNavigation);
  return new ChromeExtensionProxyPageAgent(page);
};

const STORAGE_KEY = 'midscene-popup-mode';

export function PlaygroundPopup() {
  const { setPopupTab } = useEnvConfig();
  const [currentMode, setCurrentMode] = useState<
    'playground' | 'bridge' | 'recorder'
  >(() => {
    localStorage.setItem(STORAGE_KEY, 'playground');
    return 'playground';
  });

  const { config, loadConfig } = useEnvConfig();
  const setDomIncluded = useEnvConfig((state) => state.setDomIncluded);
  
  // Sync popupTab with saved mode on mount
  useEffect(() => {
    setPopupTab(currentMode);
    setDomIncluded(true);
    loadConfig(`
      OPENAI_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
      OPENAI_API_KEY="d45fc7c0-1eb3-45e4-aea3-973fdf7b5e3e"
      MIDSCENE_MODEL_NAME="doubao-seed-1-6-flash-250828"
      MIDSCENE_USE_DOUBAO_VISION=1
    `);
    // 豆包大模型
    // OPENAI_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
    // OPENAI_API_KEY="d45fc7c0-1eb3-45e4-aea3-973fdf7b5e3e"
    // MIDSCENE_MODEL_NAME="doubao-seed-1-6-flash-250828"
    // MIDSCENE_USE_DOUBAO_VISION=1
    // qwen大模型
    // OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
    // OPENAI_API_KEY="sk-d26d3681b3b74ec4bb8560cdcf84e943"
    // MIDSCENE_MODEL_NAME="qwen-vl-flash"
    // MIDSCENE_USE_QWEN_VL=1
    // localStorage.setItem('midscene-bridge-auto-connect','true');
  }, []);

  // Override AI configuration
  useEffect(() => {
    console.log('Chrome Extension - Overriding AI config:', config);
    console.log('OPENAI_API_KEY exists:', !!OPENAI_API_KEY);

    if (config && Object.keys(config).length >= 1) {
      safeOverrideAIConfig(config);
    }
  }, [config]);

  const menuItems = [
    {
      key: 'playground',
      icon: <SendOutlined />,
      label: 'Playground',
      onClick: () => {
        setCurrentMode('playground');
        setPopupTab('playground');
        localStorage.setItem(STORAGE_KEY, 'playground');
      },
    },
    {
      key: 'recorder',
      label: 'Recorder (Preview)',
      icon: <VideoCameraOutlined />,
      onClick: () => {
        setCurrentMode('recorder');
        setPopupTab('recorder');
        localStorage.setItem(STORAGE_KEY, 'recorder');
      },
    },
    {
      key: 'bridge',
      icon: <ApiOutlined />,
      label: 'Bridge Mode',
      onClick: () => {
        setCurrentMode('bridge');
        setPopupTab('bridge');
        localStorage.setItem(STORAGE_KEY, 'bridge');
      },
    },
  ];

  const renderContent = () => {
    if (currentMode === 'bridge') {
      return (
        <div className="popup-content bridge-mode">
          <div className="bridge-container">
            <Bridge />
          </div>
        </div>
      );
    }
    if (currentMode === 'recorder') {
      return (
        <div className="popup-content recorder-mode">
          <Recorder />
        </div>
      );
    }

    // Check if configuration is ready
    const configReady = config && Object.keys(config).length >= 1;
    console.log('Playground mode - config:', {
      config,
      configReady,
    });

    return (
      <div className="popup-content">
        {/* Playground Component */}
        <div className="playground-component">
          <BrowserExtensionPlayground
            getAgent={(forceSameTabNavigation?: boolean) => {
              console.log(
                'getAgent called with forceSameTabNavigation:',
                forceSameTabNavigation,
              );
              return extensionAgentForTab(forceSameTabNavigation);
            }}
            showContextPreview={false}
          />
        </div>
      </div>
    );
  };

  return (
    <ConfigProvider theme={globalThemeConfig()}>
      <div id="midscene-extension-sidebar" className="popup-wrapper">
        {/* top navigation bar */}
        <div className="popup-nav">
          <div className="nav-left">
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomLeft"
              overlayClassName="mode-selector-dropdown"
            >
              <MenuOutlined className="nav-icon menu-trigger" />
            </Dropdown>
            <span className="nav-title">
              {currentMode === 'playground'
                ? 'Playground'
                : currentMode === 'recorder'
                  ? 'Recorder'
                  : 'Bridge Mode'}
            </span>
          </div>
          <div className="nav-right">
            <NavActions showTooltipWhenEmpty={false} showModelName={false} />
          </div>
        </div>

        {/* main content area */}
        {renderContent()}
      </div>
    </ConfigProvider>
  );
}
