/**
 * AI参谋分析代理服务器
 * 解决前端跨域问题，安全调用豆包大模型API
 * 
 * 使用方法：
 * 1. 安装依赖：npm install
 * 2. 启动服务：node proxy-server.js
 * 3. 代理服务器运行在 http://localhost:3003
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT) || 3003;

// 启用CORS，允许前端访问
app.use(cors({
    origin: '*',  // 允许所有来源（生产环境建议指定具体域名）
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));

// 提供静态文件服务（HTML, CSS, JS, 图片等）
app.use(express.static(__dirname));

// 豆包AI配置
const DOUBAO_CONFIG = {
    apiKey: 'api-key-20260319101617',
    apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-pro-32k'
};

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        service: 'AI参谋分析代理服务器',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// AI分析代理接口
app.post('/api/ai/analyze', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { input, provider = 'doubao' } = req.body;
        
        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                error: '请输入要分析的内容',
                code: 'INVALID_INPUT'
            });
        }
        
        console.log(`[${new Date().toLocaleString()}] 收到分析请求: ${input.substring(0, 50)}...`);
        
        // 构建系统提示词
        const systemPrompt = `你是客户分析助手，按客户分析模型输出多维分析结果。

【输出格式要求】
请严格按照以下结构输出：

## 分析摘要
用2-3句话概括核心结论

## 核心维度
- 资产与负债情况：...
- 现金流情况：...
- 资产配置/合作结构：...
- 交易行为与活跃程度：...

## 对比分析
- 对比对象：...
- 比较维度：...
- 差异结论：...

## 跟进建议
- 待确认需求项：...
- 建议动作：...
- 记录要求：...

## 风险提示
- 风险1：...
- 风险2：...

【要求】
1. 使用Markdown格式，标题用##，列表用-
2. 数据要具体，给出可验证字段或合理区间
3. 观点基于客观维度，避免主观标签
4. 表述准确、无歧义
5. 最后必须声明"本分析仅供参考，不构成投资建议"`;
        
        // 调用豆包API
        const response = await fetch(DOUBAO_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: DOUBAO_CONFIG.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `请对以下对象进行客户多维分析：${input}` }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`豆包API错误: ${response.status} - ${errorText}`);
            
            if (response.status === 401) {
                return res.status(500).json({
                    error: 'API密钥无效，请检查配置',
                    code: 'API_KEY_INVALID'
                });
            } else if (response.status === 429) {
                return res.status(500).json({
                    error: '请求过于频繁，请稍后再试',
                    code: 'RATE_LIMIT'
                });
            } else {
                return res.status(500).json({
                    error: `AI服务暂时不可用 (${response.status})`,
                    code: 'API_ERROR'
                });
            }
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({
                error: 'AI返回数据格式不正确',
                code: 'INVALID_RESPONSE'
            });
        }
        
        const aiResponse = data.choices[0].message.content;
        const duration = Date.now() - startTime;
        
        console.log(`[${new Date().toLocaleString()}] 分析完成，耗时 ${duration}ms`);
        
        // 返回给前端
        res.json({
            success: true,
            content: aiResponse,
            model: DOUBAO_CONFIG.model,
            duration: duration,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('代理服务器错误:', error);
        
        res.status(500).json({
            error: error.message || '服务器内部错误',
            code: 'SERVER_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('未处理的错误:', err);
    res.status(500).json({
        error: '服务器内部错误',
        code: 'INTERNAL_ERROR'
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🤖 AI参谋分析代理服务器已启动');
    console.log('='.repeat(60));
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`🌐 工作台页面: http://localhost:${PORT}/index.html`);
    console.log(`🔗 代理接口: http://localhost:${PORT}/api/ai/analyze`);
    console.log(`💻 健康检查: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));
    console.log('📋 使用方法:');
    console.log('   1. 保持此窗口运行');
    console.log('   2. 刷新前端页面');
    console.log('   3. 点击参谋卡片即可使用真实AI分析');
    console.log('='.repeat(60));
});