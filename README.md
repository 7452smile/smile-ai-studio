# Smile AI Studio

> 一个集成多种 AI 模型的创意工作室平台，支持图片生成、视频生成、音频生成、图片处理等功能

## 📋 项目概览

**Smile AI Studio** 是一个基于 Supabase 的 AI 创意工作室平台，提供：

- 🎨 **图片生成**：Seedream 4.5、Banana Pro
- 🎬 **视频生成**：Kling AI、Minimax、Wan、Seedance、Runway、PixVerse、LTX
- 🎵 **音频生成**：ElevenLabs TTS（9987+ 语音）
- 🖼️ **图片处理**：Magnific 高清放大、背景移除
- 💳 **订阅系统**：6 档套餐（免费/入门/进阶/旗舰/工作室/企业）
- 🎁 **推荐系统**：邀请奖励 + 佣金分成
- 🎫 **兑换码系统**：积分码 + 订阅码
- 🏪 **代理站系统**：多域名品牌化运营

---

## 🏗️ 技术架构

### 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Supabase Edge Functions (Deno)
- **数据库**：PostgreSQL (Supabase)
- **存储**：Cloudflare R2
- **实时通信**：Supabase Realtime
- **支付**：zpayz.cn (支付宝) + PayPal

### 核心模块

```
├── src/
│   ├── components/          # React 组件
│   │   ├── LandingPage.tsx  # 落地页（支持代理品牌）
│   │   ├── AdminPage.tsx    # 管理员后台
│   │   ├── AgentPage.tsx    # 代理商后台
│   │   └── ...
│   ├── context/
│   │   └── GenerationContext.tsx  # 全局状态管理（2100+ 行）
│   ├── services/
│   │   ├── api.ts           # Supabase 客户端
│   │   └── creditsCost.ts   # 积分计费逻辑
│   └── types.ts             # TypeScript 类型定义
│
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── _shared/         # 共享模块
│   │   │   ├── freepik.ts   # API Key 轮换
│   │   │   ├── r2.ts        # R2 存储（AWS Signature V4）
│   │   │   ├── userCredits.ts  # 积分操作
│   │   │   ├── subscription.ts # 并发检查
│   │   │   ├── response.ts  # CORS 处理
│   │   │   └── auth.ts      # JWT 验证
│   │   ├── agent-config/    # 代理配置查询
│   │   ├── agent-query/     # 代理数据查询
│   │   ├── agent-action/    # 代理操作
│   │   ├── seedream-generate/  # 图片生成
│   │   ├── kling-video/     # 视频生成
│   │   ├── tts-generate/    # 音频生成
│   │   └── ...
│   └── migrations/          # SQL 迁移文件
│       ├── 005_subscription_system.sql
│       ├── 008_referral_system.sql
│       ├── 009_redemption_code_system.sql
│       └── 025_agent_system.sql
```

---

## 🏪 代理站系统

### 系统架构

代理站系统允许多个独立域名使用同一套后端，每个代理站可以：

- 自定义品牌名称和 Logo
- 设置独立的套餐定价
- 获取订单佣金
- 生成专属兑换码
- 管理自己的用户

### 数据库表结构

```sql
-- 代理表
agents (
  id, user_id, domain, brand_name, logo_url,
  balance, credits_rate, status, payment_info,
  contact_wechat, contact_telegram, contact_email
)

-- 代理套餐定价
agent_tier_pricing (agent_id, tier_id, cost_price, sell_price)

-- 代理交易记录
agent_transactions (type: commission/credits_purchase/withdrawal...)

-- 代理提现
agent_withdrawals (status: pending/approved/rejected/paid)
```

### 工作流程

1. **域名识别**：前端根据 `window.location.hostname` 判断是否为代理站
2. **配置加载**：调用 `agent-config` Edge Function 获取品牌配置
3. **品牌展示**：使用代理的 `brand_name` 和 `logo_url` 替换默认品牌
4. **订单归属**：用户注册时记录 `agent_id`，订单支付时计算佣金
5. **佣金结算**：订单完成后自动计算并记录代理佣金

---

## 🔧 管理员添加代理站操作指南

### 前置准备

- 代理商提供：域名、品牌名称、Logo URL、联系方式
- 管理员权限：手机号在 `constants.ts` 的 `ADMIN_PHONES` 白名单中

### 操作步骤

#### 1. 服务器 Nginx 配置

在服务器上添加代理域名的 Nginx 配置：

```nginx
# /etc/nginx/sites-available/agent-example.com
server {
    listen 80;
    listen [::]:80;
    server_name agent-example.com www.agent-example.com;

    # 强制 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name agent-example.com www.agent-example.com;

    # SSL 证书（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/agent-example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agent-example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 前端静态文件
    root /var/www/smile-ai-studio/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到 Supabase
    location /functions/ {
        proxy_pass https://your-project.supabase.co/functions/;
        proxy_set_header Host your-project.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**启用配置：**

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/agent-example.com /etc/nginx/sites-enabled/

# 申请 SSL 证书
sudo certbot --nginx -d agent-example.com -d www.agent-example.com

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 2. Cloudflare R2 CORS 配置

在 Cloudflare 控制台添加代理域名到 R2 CORS 策略：

**方式一：通过 Cloudflare Dashboard**

1. 登录 Cloudflare Dashboard
2. 进入 R2 → 选择你的 Bucket
3. 点击 "Settings" → "CORS Policy"
4. 添加新规则：

```json
[
  {
    "AllowedOrigins": [
      "https://smile-ai-studio.com",
      "https://www.smile-ai-studio.com",
      "https://agent-example.com",
      "https://www.agent-example.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**方式二：通过 Wrangler CLI**

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 创建 cors.json
cat > cors.json << 'EOF'
[
  {
    "AllowedOrigins": [
      "https://smile-ai-studio.com",
      "https://www.smile-ai-studio.com",
      "https://agent-example.com",
      "https://www.agent-example.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# 应用 CORS 配置
wrangler r2 bucket cors put YOUR_BUCKET_NAME --file cors.json
```

#### 3. 后端 CORS 配置（自动处理）

后端已实现宽松 CORS 模式，无需手动配置：

```typescript
// supabase/functions/_shared/response.ts
function getCorsOrigin(origin?: string | null): string {
    if (!origin) return ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    if (origin.startsWith("http://localhost:")) return origin;
    // 宽松模式：允许任何 https 来源（代理站 CNAME 绑定的域名）
    if (origin.startsWith("https://")) return origin;
    return ALLOWED_ORIGINS[0];
}
```

**说明**：所有 `https://` 开头的域名都会被自动允许，因为所有 API 都有 JWT 认证保护。

#### 4. 数据库添加代理记录

**方式一：通过管理员后台（推荐）**

1. 登录管理员账号（手机号在白名单中）
2. 点击左下角 "盾牌" 图标进入管理后台
3. 切换到 "代理商" 标签页
4. 点击 "添加代理" 按钮
5. 填写表单：
   - **用户手机号**：代理商的注册手机号
   - **域名**：`agent-example.com`（不含 `https://`）
   - **品牌名称**：`示例 AI 工作室`
   - **Logo URL**：`https://example.com/logo.png`
   - **联系方式**：微信/Telegram/邮箱
6. 点击 "创建" 完成

**方式二：通过 SQL（直接操作数据库）**

```sql
-- 1. 查找代理商的 user_id
SELECT id, phone FROM user_profiles WHERE phone = '13800138000';

-- 2. 插入代理记录
INSERT INTO agents (
    user_id,
    domain,
    brand_name,
    logo_url,
    balance,
    credits_rate,
    status,
    contact_wechat,
    contact_telegram,
    contact_email
) VALUES (
    'user-uuid-here',
    'agent-example.com',
    '示例 AI 工作室',
    'https://example.com/logo.png',
    0,
    100,
    'active',
    'wechat_id',
    '@telegram_username',
    'contact@example.com'
);

-- 3. 设置代理套餐定价（可选，不设置则使用默认价格）
INSERT INTO agent_tier_pricing (agent_id, tier_id, cost_price, sell_price, is_active)
SELECT
    (SELECT id FROM agents WHERE domain = 'agent-example.com'),
    id,
    CASE id
        WHEN 'starter' THEN 15.00
        WHEN 'advanced' THEN 40.00
        WHEN 'flagship' THEN 80.00
        WHEN 'studio' THEN 250.00
        WHEN 'enterprise' THEN 1100.00
    END,
    CASE id
        WHEN 'starter' THEN 19.90
        WHEN 'advanced' THEN 49.00
        WHEN 'flagship' THEN 99.00
        WHEN 'studio' THEN 299.00
        WHEN 'enterprise' THEN 1299.00
    END,
    true
FROM subscription_tiers
WHERE id != 'free';
```

#### 5. DNS 配置

代理商需要在域名 DNS 服务商处添加 CNAME 记录：

```
类型: CNAME
主机记录: @
记录值: smile-ai-studio.com
TTL: 600
```

如果需要 www 子域名：

```
类型: CNAME
主机记录: www
记录值: smile-ai-studio.com
TTL: 600
```

#### 6. 验证配置

**检查清单：**

- [ ] Nginx 配置已生效（`curl -I https://agent-example.com`）
- [ ] SSL 证书正常（浏览器无警告）
- [ ] R2 CORS 已添加代理域名
- [ ] 数据库中代理记录已创建
- [ ] DNS CNAME 已生效（`nslookup agent-example.com`）
- [ ] 访问代理站显示自定义品牌名和 Logo
- [ ] 代理商可以登录代理后台（左下角 "商店" 图标）

**测试步骤：**

```bash
# 1. 测试域名解析
nslookup agent-example.com

# 2. 测试 HTTPS 访问
curl -I https://agent-example.com

# 3. 测试代理配置 API
curl "https://your-project.supabase.co/functions/v1/agent-config?domain=agent-example.com"

# 预期返回：
# {
#   "agent": {
#     "id": "...",
#     "brand_name": "示例 AI 工作室",
#     "logo_url": "https://example.com/logo.png",
#     "tier_pricing": [...]
#   }
# }
```

#### 7. 常见问题排查

**问题 1：代理站显示主站品牌**

- 检查 `agents` 表中 `domain` 字段是否正确（不含 `https://` 和尾部 `/`）
- 检查 `status` 字段是否为 `active`
- 打开浏览器控制台，查看 `agent-config` API 返回值

**问题 2：CORS 错误**

- 检查 R2 CORS 配置是否包含代理域名
- 检查域名是否使用 HTTPS（HTTP 会被拒绝）
- 清除浏览器缓存后重试

**问题 3：SSL 证书错误**

- 确认 Certbot 已成功申请证书
- 检查 Nginx 配置中证书路径是否正确
- 运行 `sudo certbot renew --dry-run` 测试续期

**问题 4：代理商无法登录后台**

- 确认代理商已注册账号
- 确认 `agents.user_id` 与代理商的 `user_profiles.id` 匹配
- 检查代理商是否在代理站域名下登录（不是主站）

---

## 💳 积分与订阅系统

### 积分计费规则

| 功能 | 模型 | 积分消耗 |
|------|------|----------|
| 图片生成 | Seedream 4.5 | 4 |
| 图片生成 | Banana Pro | 20 |
| 视频生成 | Kling AI | 84-495（根据时长和音频） |
| 视频生成 | Minimax | 24-47 |
| 视频生成 | Wan | 42-189 |
| 视频生成 | Seedance | 25-130 |
| 视频生成 | PixVerse | 14-72 |
| 视频生成 | LTX | 30-135 |
| 视频生成 | Runway | 60/96/120 |
| 高清放大 | Magnific | 10-120（根据分辨率） |
| 背景移除 | Remove BG | 2 |
| 语音合成 | ElevenLabs TTS | 5/1000字符 |

### 订阅套餐

| 套餐 | 月付 | 年付 | 月积分 | 并发数 |
|------|------|------|--------|--------|
| 免费版 | ¥0 | - | 10/天（上限200） | 图1/视0 |
| 入门版 | ¥19.9 | ¥199 | 1000 | 图3/视1 |
| 进阶版 | ¥49 | ¥490 | 3000 | 图5/视2 |
| 旗舰版 | ¥99 | ¥990 | 7000 | 图10/视3 |
| 工作室版 | ¥299 | ¥2990 | 25000 | 图20/视5 |
| 企业版 | ¥1299 | ¥12990 | 120000 | 图50/视10 |

---

## 🎁 推荐与兑换系统

### 推荐奖励

- **注册奖励**：邀请人和被邀请人各得 100 积分
- **佣金分成**：被邀请人订阅时，邀请人获得 10% 积分佣金
- **佣金上限**：每个被邀请人最多 3 次订单，企业版除外

### 兑换码类型

- **积分码**（`promo`）：直接兑换积分
- **订阅码**（`new_user`）：新用户专享（注册 7 天内）

---

## 🛠️ 开发指南

### 环境要求

- Node.js 18+
- Supabase CLI
- Cloudflare R2 账号
- Freepik API Key

### 本地开发

```bash
# 1. 克隆项目
git clone <repository-url>
cd smile-ai-studio

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Supabase URL、Key 等

# 4. 启动 Supabase 本地服务
supabase start

# 5. 运行数据库迁移
supabase db push

# 6. 启动前端开发服务器
npm run dev

# 7. 部署 Edge Functions（可选）
supabase functions deploy
```

### 环境变量

**前端（`.env`）：**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Edge Functions（Supabase Dashboard → Settings → Secrets）：**

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://your-r2-public-domain.com

# Freepik API
FREEPIK_API_KEYS=key1,key2,key3

# Webhook
WEBHOOK_BASE_URL=https://your-project.supabase.co/functions/v1

# 支付
ZPAYZ_PID=your-zpayz-pid
ZPAYZ_KEY=your-zpayz-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

### 部署

**前端部署（Nginx）：**

```bash
# 1. 构建生产版本
npm run build

# 2. 上传到服务器
scp -r dist/* user@server:/var/www/smile-ai-studio/

# 3. 重启 Nginx
sudo systemctl reload nginx
```

**Edge Functions 部署：**

```bash
# 部署所有函数
supabase functions deploy

# 部署单个函数
supabase functions deploy agent-config
```

---

## 📊 管理员功能

### 权限配置

在 `constants.ts` 中添加管理员手机号：

```typescript
export const ADMIN_PHONES: string[] = [
  '18112521254',
  '13800138000', // 新增管理员
];
```

### 管理后台功能

- **概览**：用户统计、收入统计、订阅分布
- **用户管理**：查看用户、调整积分、修改套餐
- **订单管理**：查看订单、手动标记支付
- **任务管理**：实时监控生成任务
- **订阅管理**：查看活跃订阅
- **API Key 管理**：查看/切换 Freepik API Key
- **推荐管理**：查看推荐关系和佣金
- **兑换码管理**：创建/批量创建/禁用兑换码
- **审计日志**：查看操作记录
- **代理商管理**：添加/编辑/查看代理商

---

## 🔐 安全注意事项

1. **JWT 认证**：所有 Edge Functions 都需要有效的 JWT Token
2. **手机号验证**：使用阿里云短信验证码
3. **积分原子操作**：使用 PostgreSQL `FOR UPDATE` 行锁
4. **支付签名验证**：MD5 签名防止订单伪造
5. **管理员白名单**：前后端双重验证
6. **CORS 限制**：仅允许 HTTPS 来源
7. **SQL 注入防护**：使用参数化查询
8. **XSS 防护**：React 自动转义

---

## 📝 License

MIT License

---

## 📧 联系方式

- **主站**：https://smile-ai-studio.com
- **技术支持**：admin@smileai.studio
- **GitHub Issues**：[提交问题](https://github.com/your-repo/issues)

---

## 🙏 致谢

- [Supabase](https://supabase.com/) - 后端即服务
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - 对象存储
- [Freepik API](https://www.freepik.com/api) - AI 模型接口
- [React](https://react.dev/) - 前端框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
