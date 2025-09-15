/**
 * LocalStorage データアダプター
 * Infrastructure Layer - データ永続化の基盤実装
 * localStorageを扱うためのクラス。「データ保存」「読み込み」「削除」などに関する処理が記述
*/

export class LocalStorageAdapter {
    constructor() {
        this.debugMode = true;
    }

    //debug用ログ出力のメソッドを定義
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[LocalStorageAdapter] ${message}`, data || '');
        }
    }

    /**
     * データを保存するメソッドの定義
     * @param {string} key - 保存キー
     * @param {*} data - 保存するデータ
     * @returns {boolean} 成功/失敗
     */
    save(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            this.debugLog(`データ保存成功: ${key}`, { size: jsonData.length });
            return true;
        } catch (error) {
            this.debugLog(`データ保存エラー: ${key}`, error);
            return false;
        }
    }

    /**
     * データを読み込みするためのメソッドの定義
     * @param {string} key - 読み込みキー
     * @returns {*|null} データまたはnull
     */
    load(key) {
        try {
            const jsonData = localStorage.getItem(key);
            if (jsonData === null) {
                this.debugLog(`データが存在しません: ${key}`);
                return null;
            }
            const data = JSON.parse(jsonData);
            this.debugLog(`データ読み込み成功: ${key}`, { type: typeof data });
            return data;
        } catch (error) {
            this.debugLog(`データ読み込みエラー: ${key}`, error);
            return null;
        }
    }

    /**
     * データを削除
     * @param {string} key - 削除キー
     * @returns {boolean} 成功/失敗
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            this.debugLog(`データ削除完了: ${key}`);
            return true;
        } catch (error) {
            this.debugLog(`データ削除エラー: ${key}`, error);
            return false;
        }
    }

    /**
     * 指定パターンのキーを全て取得するためのメソッド定義
     * @param {string} pattern - 検索パターン
     * @returns {Array<string>} マッチするキー一覧
     */
    getKeys(pattern = '') {
        try {
            const keys = Object.keys(localStorage);
            const matchedKeys = pattern 
                ? keys.filter(key => key.includes(pattern))
                : keys;
            this.debugLog(`キー検索結果: ${pattern || 'all'}`, matchedKeys);
            return matchedKeys;
        } catch (error) {
            this.debugLog(`キー検索エラー: ${pattern}`, error);
            return [];
        }
    }

    /**
     * ストレージ容量チェックするためのメソッド定義
     * @returns {Object} 容量情報
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
            });

            const info = {
                totalKeys: keys.length,
                totalSize: totalSize,
                totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
                availableSpace: 5120 - Math.round(totalSize / 1024) // 一般的な5MBリミット
            };

            this.debugLog('ストレージ情報:', info);
            return info;
        } catch (error) {
            this.debugLog('ストレージ情報取得エラー:', error);
            return { error: error.message };
        }
    }

    /**
     * データの一括エクスポートするためのメソッド定義
     * @param {string} pattern - エクスポート対象パターン
     * @returns {Object} エクスポートデータ
     */
    exportData(pattern = 'investment-') {
        try {
            const keys = this.getKeys(pattern);
            const exportData = {
                timestamp: new Date().toISOString(),
                pattern,
                data: {}
            };

            keys.forEach(key => {
                exportData.data[key] = this.load(key);
            });

            this.debugLog(`データエクスポート完了: ${pattern}`, {
                keyCount: keys.length,
                size: JSON.stringify(exportData).length
            });

            return exportData;
        } catch (error) {
            this.debugLog(`データエクスポートエラー: ${pattern}`, error);
            return { error: error.message };
        }
    }

    /**
     * データの一括インポートするためのメソッド定義
     * @param {Object} importData - インポートデータ
     * @returns {boolean} 成功/失敗
     */
    importData(importData) {
        try {
            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('無効なインポートデータ形式');
            }

            let successCount = 0;
            let errorCount = 0;

            Object.entries(importData.data).forEach(([key, value]) => {
                if (this.save(key, value)) {
                    successCount++;
                } else {
                    errorCount++;
                }
            });

            this.debugLog('データインポート完了', {
                success: successCount,
                errors: errorCount,
                timestamp: importData.timestamp
            });

            return errorCount === 0;
        } catch (error) {
            this.debugLog('データインポートエラー:', error);
            return false;
        }
    }

    /**
     * デバッグモード切り替えするためのメソッド定義
     * @param {boolean} enabled - 有効/無効
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.debugLog('デバッグモード変更:', enabled ? 'ON' : 'OFF');
    }
}

// デフォルトエクスポート
export default LocalStorageAdapter;