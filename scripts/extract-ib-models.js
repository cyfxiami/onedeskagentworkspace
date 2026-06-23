const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', '投行业务模型清单文件-v5.2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dataMatch = html.match(/const data = (\{[\s\S]*?\n      \});/);
const data = eval('(' + dataMatch[1] + ')');

const bizLinks = [...html.matchAll(/data-biz="([^"]+)"/g)].map((m) => m[1]);
const uniqueBiz = [...new Set(bizLinks.filter((b) => b.endsWith('业务模型')))];

function extractTemplate(bizKey) {
    const re = new RegExp(`<template id="tpl-${bizKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([\\s\\S]*?)</template>`);
    const match = html.match(re);
    if (!match) return null;

    const tpl = match[1];
    const cards = [...tpl.matchAll(/model-card model-0(\d)[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g)];
    const columns = ['analysis', 'design', 'validation'];
    const result = { analysis: [], design: [], validation: [] };

    for (let i = 0; i < 3; i++) {
        const cardRe = new RegExp(`model-card model-0${i + 1}([\\s\\S]*?)(?=model-card model-0|$)`);
        const cardMatch = tpl.match(cardRe);
        if (!cardMatch) continue;
        const cardHtml = cardMatch[1];
        const sections = [...cardHtml.matchAll(/<div class="section-title"[^>]*>([^<]+)<\/div>([\s\S]*?)(?=<div class="section">|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/g)];
        sections.forEach((sec) => {
            const section = sec[1].trim();
            const body = sec[2];
            const tags = [...body.matchAll(/<span class="item-tag">([^<]+)<\/span>/g)].map((t) => t[1].trim());
            const subSections = [...body.matchAll(/<div class="sub-section-title"[^>]*>([^<]+)<\/div>([\s\S]*?)(?=<div class="sub-section">|$)/g)];
            if (subSections.length) {
                subSections.forEach((sub) => {
                    const subName = sub[1].trim();
                    const subTags = [...sub[2].matchAll(/<span class="item-tag">([^<]+)<\/span>/g)].map((t) => t[1].trim());
                    result[columns[i]].push({
                        section,
                        subSection: subName,
                        models: subTags.length ? subTags : [subName]
                    });
                });
            } else if (tags.length) {
                result[columns[i]].push({ section, models: tags });
            } else {
                result[columns[i]].push({ section, models: [section] });
            }
        });
    }
    return result;
}

const businesses = uniqueBiz.map((key) => {
    const short = key.replace('业务模型', '');
    const category = ['定增', 'IPO', '可转债'].includes(short) ? '股权类'
        : ['公司债', '银行间债务工具', 'ABS'].includes(short) ? '债权类' : '并购类';
    const columns = extractTemplate(key);
    const fallback = data[key];
    const normalized = columns || {
        analysis: (fallback?.left || []).map((section) => ({ section, models: [section] })),
        design: (fallback?.mid || []).map((section) => ({ section, models: [section] })),
        validation: (fallback?.right || []).map((section) => ({ section, models: [section] }))
    };
    return { key, name: short, category, columns: normalized };
});

const serviceModels = [
    {
        key: '买方分析模型',
        name: '买方分析模型',
        tagline: '找买方',
        sections: [
            { section: '买方筛选', models: ['产业投资人匹配', '财务投资人匹配', '战略协同买方'] }
        ]
    },
    {
        key: '信披判断模型',
        name: '信披判断模型',
        tagline: '识信披',
        sections: [
            { section: '披露义务判断', models: ['重大事项披露', '关联交易披露', '进展公告披露'] }
        ]
    },
    {
        key: '临时公告生成模型',
        name: '临时公告生成模型',
        tagline: '写公告',
        sections: [
            { section: '债券基本情况', models: ['债券代码', '债券余额', '到期日', '主体评级', '担保'] },
            { section: '触发事项说明', models: ['事项类型', '事项原因', '变更前后对比'] },
            { section: '影响分析', models: ['对偿债能力的影响'] },
            { section: '受托管理人意见', models: ['核查结论', '适用规则条款'] }
        ]
    }
];

const assistantConfig = [
    { index: 0, column: 'customer', label: '客户分析', tagline: '看客户' },
    { index: 1, column: 'analysis', label: '业务分析模型', tagline: '找目标' },
    { index: 2, column: 'design', label: '方案设计模型', tagline: '出方案' },
    { index: 3, column: 'validation', label: '交叉验证模型', tagline: '核异常' },
    { index: 4, column: 'service', label: '客户服务', tagline: '做服务' }
];

const keywords = {
    0: ['客户分析', '客户需求', '客户价值', '客户关系', '客户风险', '潜在客户', '客户跟进', '客户分层', '企业客户', '个人客户', '交易行为', '合作记录', '资产规模'],
    1: ['业务分析', '业务分析模型', '找目标', '股东与实控人', '基本标准', '公司标准'],
    2: ['方案设计', '方案设计模型', '方案生成', '出方案', '重整方案', '定增方案', '发行方案', '融资方案', '发行规模', '发行价格'],
    3: ['交叉验证', '交叉验证模型', '核异常', '验证', '复核', '比对', '核验', '财务数据异常', '治理结构'],
    4: ['客户服务', '买方分析', '信披判断', '临时公告', '公告生成', '识信披', '写公告', '找买方']
};

const businessKeywords = {};
businesses.forEach((biz) => {
    businessKeywords[biz.name] = [biz.name, biz.key];
    if (biz.name === '银行间债务工具') businessKeywords[biz.name].push('银行间', '债务融资工具');
    if (biz.name === '上市公司收购资产') businessKeywords[biz.name].push('收购资产', '资产重组');
    if (biz.name === '收购上市公司') businessKeywords[biz.name].push('借壳', '控股权收购');
});

const output = `/* 由 scripts/extract-ib-models.js 从投行业务模型清单文件-v5.2.html 生成 */
window.IB_MODEL_KNOWLEDGE = ${JSON.stringify({ businesses, serviceModels, assistantConfig, keywords, businessKeywords }, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'ib-model-knowledge.js'), output, 'utf8');
console.log('Generated ib-model-knowledge.js with', businesses.length, 'businesses');
