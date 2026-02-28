/**
 * 使用 Google Translate 免费接口翻译文本
 * 无需 API key，无需注册
 */
export async function translate(text: string, source = "auto", target = "en"): Promise<string> {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        // 返回格式: [[["translated text","source text",null,null,10]],null,"zh-CN"]
        const translated = data?.[0]?.map((item: any) => item[0]).join("") || "";
        if (translated) {
            console.log(`Translated [${source}->${target}]: "${text.slice(0, 50)}" -> "${translated.slice(0, 50)}"`);
            return translated;
        }
        console.error("Translation failed: empty result", JSON.stringify(data));
        return text;
    } catch (err) {
        console.error("Translation request error:", err);
        return text;
    }
}

/** 检测文本是否包含中文字符 */
export function hasChinese(text: string): boolean {
    return /[\u4e00-\u9fff]/.test(text);
}
