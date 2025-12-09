// crypto-utils.ts
import CryptoJS from 'crypto-js';

/**
 * AES解密配置选项
 */
export interface AESDecryptOptions {
  /**
   * 密钥
   */
  key: string;
  /**
   * 加密模式，默认 CBC
   */
  mode?: typeof CryptoJS.mode.CBC | typeof CryptoJS.mode.ECB | typeof CryptoJS.mode.CFB | typeof CryptoJS.mode.OFB | typeof CryptoJS.mode.CTR;
  /**
   * 填充模式，默认 Pkcs7
   */
  padding?: typeof CryptoJS.pad.Pkcs7 | typeof CryptoJS.pad.AnsiX923 | typeof CryptoJS.pad.Iso10126 | typeof CryptoJS.pad.Iso97971 | typeof CryptoJS.pad.ZeroPadding | typeof CryptoJS.pad.NoPadding;
  /**
   * 初始化向量（CBC模式需要）
   */
  iv?: string;
  /**
   * 输入编码格式，默认 base64
   */
  inputEncoding?: 'base64' | 'hex' | 'utf8';
  /**
   * 输出编码格式，默认 utf8
   */
  outputEncoding?: 'base64' | 'hex' | 'utf8';
}

/**
 * AES解密结果
 */
export interface AESDecryptResult {
  /**
   * 解密后的原始数据
   */
  data: string;
  /**
   * 解密是否成功
   */
  success: boolean;
  /**
   * 错误信息（如果有）
   */
  error?: string;
}

/**
 * AES解密工具类
 */
export class AESDecryptor {
  private readonly defaultOptions: Partial<AESDecryptOptions> = {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    inputEncoding: 'base64',
    outputEncoding: 'utf8'
  };

  /**
   * 解密AES加密的数据
   * @param encryptedData 加密的数据
   * @param options 解密选项
   * @returns 解密结果
   */
  public decrypt(encryptedData: string, options: AESDecryptOptions): AESDecryptResult {
    try {
      // 验证必需参数
      if (!encryptedData) {
        return {
          data: '',
          success: false,
          error: '加密数据不能为空'
        };
      }

      if (!options.key) {
        return {
          data: '',
          success: false,
          error: '解密密钥不能为空'
        };
      }

      // 合并配置
      const decryptOptions = { ...this.defaultOptions, ...options };

      // 准备解密参数
      const key = CryptoJS.enc.Utf8.parse(options.key);
      const decryptConfig: any = {
        mode: decryptOptions.mode,
        padding: decryptOptions.padding
      };

      // 处理IV（对于需要IV的模式）
      if (this.isModeRequiresIV(decryptOptions.mode!) && decryptOptions.iv) {
        decryptConfig.iv = CryptoJS.enc.Utf8.parse(decryptOptions.iv);
      }

      // 根据输入编码格式解析加密数据
      let encrypted;
      switch (decryptOptions.inputEncoding) {
        case 'base64':
          encrypted = CryptoJS.enc.Base64.parse(encryptedData);
          break;
        case 'hex':
          encrypted = CryptoJS.enc.Hex.parse(encryptedData);
          break;
        case 'utf8':
          encrypted = CryptoJS.enc.Utf8.parse(encryptedData);
          break;
        default:
          encrypted = CryptoJS.enc.Base64.parse(encryptedData);
      }

      // 创建密文对象
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: encrypted
      });

      // 执行解密
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, decryptConfig);

      // 根据输出编码格式转换结果
      let result: string;
      switch (decryptOptions.outputEncoding) {
        case 'base64':
          result = CryptoJS.enc.Base64.stringify(decrypted);
          break;
        case 'hex':
          result = CryptoJS.enc.Hex.stringify(decrypted);
          break;
        case 'utf8':
          result = decrypted.toString(CryptoJS.enc.Utf8);
          break;
        default:
          result = decrypted.toString(CryptoJS.enc.Utf8);
      }

      return {
        data: result,
        success: true
      };

    } catch (error) {
      return {
        data: '',
        success: false,
        error: error instanceof Error ? error.message : '解密过程中发生未知错误'
      };
    }
  }

  /**
   * 批量解密多个数据
   * @param encryptedDataList 加密数据列表
   * @param options 解密选项
   * @returns 解密结果列表
   */
  public decryptBatch(
    encryptedDataList: string[], 
    options: AESDecryptOptions
  ): AESDecryptResult[] {
    return encryptedDataList.map(data => this.decrypt(data, options));
  }

  /**
   * 验证解密配置是否有效
   * @param options 解密选项
   * @returns 验证结果
   */
  public validateOptions(options: AESDecryptOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.key) {
      errors.push('密钥不能为空');
    }

    if (this.isModeRequiresIV(options.mode || this.defaultOptions.mode!) && !options.iv) {
      errors.push('当前加密模式需要初始化向量(IV)');
    }

    if (options.iv && options.iv.length !== 16) {
      errors.push('初始化向量(IV)长度必须为16字节');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查加密模式是否需要IV
   * @param mode 加密模式
   * @returns 是否需要IV
   */
  private isModeRequiresIV(mode: typeof CryptoJS.mode.CBC | typeof CryptoJS.mode.ECB | typeof CryptoJS.mode.CFB | typeof CryptoJS.mode.OFB | typeof CryptoJS.mode.CTR): boolean {
    const modesRequiringIV = [
      CryptoJS.mode.CBC,
      CryptoJS.mode.CFB,
      CryptoJS.mode.OFB,
      CryptoJS.mode.CTR
    ];
    return modesRequiringIV.includes(mode);
  }
}

/**
 * 便捷函数：快速解密（使用默认配置）
 * @param encryptedData 加密数据
 * @param key 密钥
 * @param iv 初始化向量（可选，CBC模式需要）
 * @returns 解密结果
 */
export function quickDecrypt(encryptedData: string, key: string, iv?: string): AESDecryptResult {
  const decryptor = new AESDecryptor();
  const options: AESDecryptOptions = {
    key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    inputEncoding: 'base64',
    outputEncoding: 'utf8'
  };

  if (iv) {
    options.iv = iv;
  }

  return decryptor.decrypt(encryptedData, options);
}
// const decryptor = new AESDecryptor();

// const encryptedData = 'nFg/HPYO/LJHmfyg+5dXtq77s/w3ebRK6C4p8p2UsxI=';
// const key = 'repairXpath12345';
// const iv = 'repairXpath12345';

// const result = decryptor.decrypt(encryptedData, {
//   key,
//   iv,
//   mode: CryptoJS.mode.CBC,
//   padding: CryptoJS.pad.Pkcs7
// });

// if (result.success) {
//   console.log('解密成功:', result.data);
// } else {
//   console.error('解密失败:', result.error);
// }