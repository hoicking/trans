ALTER TABLE "ProjectAiConfig"
ADD COLUMN "activeProvider" TEXT NOT NULL DEFAULT 'deepseek',
ADD COLUMN "chatgptApiKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "chatgptModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN "deepseekApiKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "deepseekModel" TEXT NOT NULL DEFAULT 'deepseek-v4-flash';

UPDATE "ProjectAiConfig"
SET
  "activeProvider" = CASE
    WHEN lower("providerName") LIKE '%deepseek%' OR lower("baseUrl") LIKE '%deepseek%' THEN 'deepseek'
    ELSE 'chatgpt'
  END,
  "chatgptApiKey" = CASE
    WHEN lower("providerName") LIKE '%deepseek%' OR lower("baseUrl") LIKE '%deepseek%' THEN ''
    ELSE "encryptedApiKey"
  END,
  "chatgptModel" = CASE
    WHEN lower("providerName") LIKE '%deepseek%' OR lower("baseUrl") LIKE '%deepseek%' THEN 'gpt-4o-mini'
    ELSE "model"
  END,
  "deepseekApiKey" = CASE
    WHEN lower("providerName") LIKE '%deepseek%' OR lower("baseUrl") LIKE '%deepseek%' THEN "encryptedApiKey"
    ELSE ''
  END,
  "deepseekModel" = CASE
    WHEN lower("providerName") LIKE '%deepseek%' OR lower("baseUrl") LIKE '%deepseek%' THEN "model"
    ELSE 'deepseek-v4-flash'
  END;
