# 學生服務學習點數管理系統 (sslp)

一個使用 Supabase + Vite + React (TypeScript) 的學生服務學習點數管理前端範例專案。

## 功能概覽
- 學生登入與查詢服務學習點數
- 管理者介面：審核與匯出點數紀錄
- 使用 Supabase 作為後端資料庫與驗證

## 快速開始（本機開發）

### 前置需求
- Node.js >= 16
- npm 或 pnpm
- 具 supabase 專案（需要 URL 與 anon/public key）

### 安裝套件
```bash
npm install
```

### 設定環境變數
- 建議建立 `.env.local`（或在 `supabaseClient.ts` 中替換）並設定：
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```
> 注意：目前專案內 `supabaseClient.ts` 以範例常數示範，請務必不要把真實金鑰推上公開 repo；改用環境變數或 .env 檔。

### 啟動開發伺服器
```bash
npm run dev
```

### 建置
```bash
npm run build
```

## 測試與 CI
- 本專案目前未包含自動化測試，建議新增 lint / test / build workflow。

## 貢獻
- 若要修改 README，請建立分支、開 PR，並描述變更目的。

## 安全性提醒
- **不要**在程式碼庫內放置 API keys 或任何敏感憑證。若不慎洩露，請立即在 Supabase/GitHub 撤銷並重新產生。

## 授權
本專案預設使用 MIT License（可依需求改為其他 license）。

---

如需我幫你把這份 README 提交到新分支並建立 PR，請回覆「繼續」，我會接著提交與開 PR。
