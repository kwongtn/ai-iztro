/**
 * DeepSeek API调用服务
 * 负责调用DeepSeek Chat Completion API进行排盘解读
 */

import type { IFunctionalAstrolabe } from "iztro/lib/astro/FunctionalAstrolabe";
import { getAIConfig } from "./aiConfig";
import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import type FunctionalStar from "iztro/lib/star/FunctionalStar";
import type { IFunctionalSurpalaces } from "iztro/lib/astro/FunctionalSurpalaces";

export interface InterpretationRequest {
  astrolabeData: any; // 排盘数据
  focusArea?: string; // 重点关注的领域(可选)
}

export interface InterpretationResponse {
  content: string; // AI解读内容
  reasoning?: string; // 思考过程(deepseek-reasoner模型返回)
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Helper to format 三方四正
function formatStarsSimple(p: IFunctionalPalace) {
  return p.majorStars
    ?.map(
      (s: FunctionalStar) => `${s.name}${s.brightness ? `[${s.brightness}]` : ""}`
    )
    .join(",") || "(空宫)";
};

export function getSystemPrompt() {
  return [
    '# Role: 紫微斗数命理大师',
    '你是一位拥有近百年经验、通情达理且擅长心理疏导的紫微斗数大师。你的任务是根据提供的排盘数据，为命主进行深度的运势解析。',
    '',
    '# Tone & Style',
    '1.  **温暖有力量**：像一位睿智的长者，既指出问题，也给予希望。',
    '2.  **大白话翻译**：严禁堆砌术语。遇到专业词汇（如“空宫”、“化忌”）必须立刻用生活场景解释（例如：“这里是空宫，好比房子里没有主人，容易受外界环境（对宫）的影响...”）。',
    '3.  **逻辑严密**：**不要**逐个解释星星。**要**看组合、看互动。吉星遇到煞星怎么论？庙旺遇到落陷怎么论？要有权衡。',
    '',
    '# Analysis Logic (思维链)',
    '在分析前，请先在内心进行以下逻辑推演（Step-by-Step）：',
    '1.  **定格局**：看命宫、身宫及三方四正，判断命主是“开创型”、“领导型”、“支援型”还是“合作型”。',
    '2.  **辨强弱**：结合主星的庙陷利平和辅星（六吉六煞）的分布，评估命局的抗压能力。',
    '3.  **看运限**：用“先天为体，大限为用”的原则。先看本命盘的性格底色，再看当前大限/流年是给了机会（吉化）还是设置了障碍（化忌/煞星）。',
    '4.  **解冲突**：如果流年命宫好，但流年夫妻宫差，解读时要指出“事业得意，由于忙碌可能忽略伴侣”的动态关系。',
    '',
    '---',
    '',
  ].join('\n');
}

export function getBaseInformationPrompt(astrolabe: IFunctionalAstrolabe) {
  return [
    '# 📊 排盘数据 (Data Context)',
    '## 📋 命主基本信息',
    `- 性别: ${["male", "男"].includes(astrolabe.gender) ? "男" : "女"}`,
    `- 阳历: ${astrolabe.solarDate}`,
    `- 农历: ${astrolabe.lunarDate}`,
    `- 八字: ${astrolabe.chineseDate}`,
    `- 局数: ${astrolabe.fiveElementsClass}`,
    `- 命主: ${astrolabe.soul} | 身主: ${astrolabe.body}`,
    `- 星座: ${astrolabe.sign} | 生肖: ${astrolabe.zodiac}`,
    `- 命宫位置: ${astrolabe.earthlyBranchOfSoulPalace}宫 | 身宫位置: ${astrolabe.earthlyBranchOfBodyPalace}宫`,
    '',
    '',
  ].join('\n');
}

export function getFooter(focusArea?: string) {
  return [
    '',
    '',
    "---",
    "# 📝 回复结构 (Output Format)",
    "",
    "请严格按照以下Markdown格式输出：",
    "",
    "## 1. 🔭 命盘总评：（一行字带过命盘格局）",
    "*（用一句话概括核心格局，如“杀破狼变格”，并用心理学语言解释这种格局的性格本质。）*",
    "",
    "## 2. 🧬 性格画像：光辉与盲点",
    "* **用一句话概括性格**",
    "* **你的优势**：(结合命宫与吉星分析)",
    "* **潜意识盲点**：(结合化忌、煞星或空宫分析，指出容易踩坑的性格特质，如“容易心软”、“过于执着细节”等)",
    "",
    `## 3. 🎯 ${focusArea ? "深度解答" : "深度剖析"}：你最关心的问题`,
    "*(重点结合大限和流年，分析当前的事业/财运或感情趋势)*",
    "* **现状诊断**：(基于流年宫位和四化)",
    "* **未来推演**：(基于大限走势)",
    "",
    "## 4. 💡 大师锦囊 (Actionable Advice)",
    "* **机遇在哪里**：(指出哪个方向或行业有利)",
    "* **避坑指南**：(针对今年的流年煞星，给出具体生活建议，如“今年少签担保合同”、“注意呼吸道健康”)",
    "* **开运建议**：(简单的行为建议，如“多穿亮色”、“多与属X的人合作”)",
    "",
    "## 5. 📜 结语",
    "*(用温暖、鼓励的话语总结，附上一首四句定场诗)*",].join("\n");
}

export function getBasePalaceDetails(horoscope: IFunctionalHoroscope) {
  const astrolabe = horoscope.astrolabe;
  const prompt = [
    `## 🏰 十二宫详细配置`,

  ];
  if (astrolabe.palaces) {
    astrolabe.palaces.forEach((palace: IFunctionalPalace, index: number) => {
      let title = `\n### 【${palace.name}${palace.name.endsWith("宫") ? "" : "宫"}】 (地支:${palace.earthlyBranch} | 天干:${palace.heavenlyStem})`;
      if (palace.isBodyPalace) {
        title += ` (身宫)`;
      }
      prompt.push(title);

      // 格式化星曜显示 helper
      function formatStar(s: FunctionalStar) {
        return `${s.name}${s.mutagen ? `(${s.mutagen})` : ""}${s.brightness ? `[${s.brightness}]` : ""
          }`;
      }

      // 主星
      const majorStars = palace.majorStars || [];
      if (majorStars.length > 0) {
        prompt.push(`🔴 主星: ${majorStars.map(formatStar).join(", ")}\n`);
      } else {
        prompt.push(`🔴 主星: (空宫)\n`);
      }

      // 辅星
      if (palace.minorStars.length > 0) {
        prompt.push(`🔵 辅星: ${palace.minorStars.map(formatStar).join(", ")}\n`);
      } else {
        prompt.push(`🔵 辅星: (空宫)\n`);
      }

      // 杂曜
      if (palace.adjectiveStars.length > 0) {
        prompt.push(`⚪ 杂曜: ${palace.adjectiveStars
          .map(formatStar)
          .join(", ")}\n`);
      } else {
        prompt.push(`⚪ 杂曜: (空宫)\n`);
      }

      // 神煞/流曜 (包括原局神煞 + 大限/流年流曜)
      const otherStars = [];
      // 原局神煞
      otherStars.push(`长生12: ${palace.changsheng12}`);
      otherStars.push(`博士12: ${palace.boshi12}`);
      otherStars.push(`将前12: ${palace.jiangqian12}`);
      otherStars.push(`岁前12: ${palace.suiqian12}`);

      // 运限流曜 (从horoscope中获取)
      // 大限流曜
      if (horoscope.decadal?.stars?.[index]) {
        const decStars = horoscope.decadal.stars[index];
        if (decStars.length > 0) {
          otherStars.push(`大限流曜: ` + decStars.map(formatStar).join(","));
        }
      }
      // 流年流曜
      if (horoscope.yearly?.stars?.[index]) {
        const yearStars = horoscope.yearly.stars[index];
        if (yearStars.length > 0) {
          otherStars.push(`流年流曜: ` + yearStars.map(formatStar).join(","));
        }
      }

      if (otherStars.length > 0) {
        prompt.push(`✨ 其他神煞: ${otherStars.join(" | ")}\n`);
      }

      // 小限与大限时间 (对应UI显示)
      if (palace.ages || palace.decadal) {
        const limits = [];
        if (palace.ages) limits.push(`小限: ${palace.ages.join(" ")}`);
        if (palace.decadal?.range)
          limits.push(`大限: ${palace.decadal.range.join(" - ")}`);
        if (limits.length > 0) {
          prompt.push(`📅 运限时间: ${limits.join(" | ")}\n`);
        }
      }
    });
  }

}

export function getPalacesPrompt(astrolabe: IFunctionalAstrolabe) {
  const mingIndex = (astrolabe.palace("命宫") as IFunctionalPalace).index;
  const sp = astrolabe.surroundedPalaces(mingIndex);
  let prompt = [
    `## 📐 三方四正 (命宫/先天格局)`,
    `这是命盘最核心的结构(三角形+对角线)，请重点分析：`,
    `- [本宫] 命宫 (${sp.target.heavenlyStem}${sp.target.earthlyBranch}): ${formatStarsSimple(sp.target)}`,
    `- [对宫] 迁移 (${sp.opposite.heavenlyStem}${sp.opposite.earthlyBranch}): ${formatStarsSimple(sp.opposite)}`,
    `- [三合] 财帛 (${sp.wealth.heavenlyStem}${sp.wealth.earthlyBranch}): ${formatStarsSimple(sp.wealth)}`,
    `- [三合] 官禄 (${sp.career.heavenlyStem}${sp.career.earthlyBranch}): ${formatStarsSimple(sp.career)}`,
  ];

  // 三方四正 (身宫) - 如果身宫和命宫不同，补充身宫信息
  const shenPalace = astrolabe.palaces.find((palace: IFunctionalPalace) => {
    return palace.isBodyPalace
  })
  if (shenPalace && shenPalace.index !== mingIndex) {
    const shenIndex = shenPalace.index;
    const sp = astrolabe.surroundedPalaces(shenIndex);
    prompt.push(
      `## 🧘 身宫格局 (后天/中年后)`,
      `身宫代表后天发展和中年后的运势方向：`,
      `- [身宫] (${sp.target.heavenlyStem}${sp.target.earthlyBranch}): ${formatStarsSimple(sp.target)}`,
      `- [对宫] (${sp.opposite.heavenlyStem}${sp.opposite.earthlyBranch}): ${formatStarsSimple(sp.opposite)}`,
      `- [三合] 财帛 (${sp.wealth.heavenlyStem}${sp.wealth.earthlyBranch}): ${formatStarsSimple(sp.wealth)}`,
      `- [三合] 官禄 (${sp.career.heavenlyStem}${sp.career.earthlyBranch}): ${formatStarsSimple(sp.career)}`,
    );
  }
  prompt.push('', '')

  return prompt.join('\n');
}

export function mutagenFormatter(mutagen: string[]) {
  if (mutagen.length === 0) {
    return '无';
  }
  // 禄，权，科，忌
  return `${mutagen[0]}（禄），${mutagen[1]}（权），${mutagen[2]}（科），${mutagen[3]}（忌）`;
}

export function getSurroundedPalacePrompt(sp: IFunctionalSurpalaces) {
  return [
    `  * [本宫] (${sp.target.heavenlyStem}${sp.target.earthlyBranch}): ${formatStarsSimple(sp.target)}`,
    `  * [对宫] (${sp.opposite.heavenlyStem}${sp.opposite.earthlyBranch}): ${formatStarsSimple(sp.opposite)}`,
    `  * [三合] 财帛 (${sp.wealth.heavenlyStem}${sp.wealth.earthlyBranch}): ${formatStarsSimple(sp.wealth)}`,
    `  * [三合] 官禄 (${sp.career.heavenlyStem}${sp.career.earthlyBranch}): ${formatStarsSimple(sp.career)}`,
  ].join('\n');
}

export function decadalFormatter(horoscope: IFunctionalHoroscope, decadalIndex: number) {
  const decadalPalace = horoscope.astrolabe.palace(decadalIndex);
  if (!decadalPalace) {
    throw new Error("Decadal palace not found");
  }
  const prompt = [
    `- 大限位置: ${decadalPalace.name}宫`,
    `- 大限时间: ${decadalPalace.decadal.range.join(" - ") || ""} (虚岁)`,
    `- 大限四化: ${mutagenFormatter(horoscope.decadal.mutagen)}`,
  ];

  // 大限三方四正
  const sp = horoscope.astrolabe.surroundedPalaces(decadalIndex);
  if (sp) {
    prompt.push(`- 大限三方四正:`);
    prompt.push(getSurroundedPalacePrompt(sp));
    prompt.push('');
  }

  return prompt.join('\n');
}

export function yearlyFormatter(horoscope: IFunctionalHoroscope, yearlyIndex: number) {
  const yearlyPalace = horoscope.astrolabe.palace(yearlyIndex);
  if (!yearlyPalace) {
    throw new Error("Yearly palace not found");
  }

  const prompt = [
    // `\n### 当前流年 (1年运: ${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}年 - 公历${new Date().getFullYear()}年)\n`,
    `- 流年大限: ${horoscope.astrolabe.palace(horoscope.decadal.index)?.name ?? ""}宫`,
    `- 流年位置: ${yearlyPalace.name}宫`,
    `- 命主虚岁: ${horoscope.age.nominalAge}岁`,
    `- 流年四化: ${mutagenFormatter(horoscope.yearly.mutagen)}`,
  ];

  // 流年三方四正
  const sp = horoscope.astrolabe.surroundedPalaces(yearlyIndex);
  if (sp) {
    prompt.push(`- 流年三方四正:`);
    prompt.push(getSurroundedPalacePrompt(sp));
    prompt.push('');
  }

  return prompt.join('\n');
}

export function monthlyFormatter(horoscope: IFunctionalHoroscope, monthlyIndex: number) {
  const monthlyPalace = horoscope.astrolabe.palace(monthlyIndex);
  if (!monthlyPalace) {
    throw new Error("Monthly palace not found");
  }

  const prompt = [
    `- 流月位置: ${monthlyPalace.name}宫`,
    `- 流月时间: ${horoscope.monthly.heavenlyStem}${horoscope.monthly.earthlyBranch
    }年${horoscope.lunarDate.slice(5, 7)}`,
    `- 流月四化: ${mutagenFormatter(horoscope.monthly.mutagen)}`,
  ];

  // 流月三方四正
  const sp = horoscope.astrolabe.surroundedPalaces(monthlyIndex);
  if (sp) {
    prompt.push(`- 流月三方四正:`);
    prompt.push(getSurroundedPalacePrompt(sp));
    prompt.push('');
  }

  return prompt.join('\n');
}

/**
 * 构建AI提示词
 */
export function buildPrompt(
  horoscope: IFunctionalHoroscope,
  focusArea?: string
): string {
  const astrolabe = horoscope.astrolabe;
  console.log(horoscope)

  let prompt = getSystemPrompt();
  prompt += getBaseInformationPrompt(astrolabe);
  prompt += getPalacesPrompt(astrolabe);

  // 十二宫信息
  prompt += getBasePalaceDetails(horoscope);

  // 运限信息
  prompt += `\n## ⏳ 运限走势\n### 当前大限 (10年运)\n`;
  prompt += decadalFormatter(horoscope, horoscope.decadal.index);

  prompt += `\n### 当前流年 (1年运: ${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}年 - 公历${new Date().getFullYear()}年)\n`;
  prompt += yearlyFormatter(horoscope, horoscope.yearly.index);

  prompt += `\n### 当前流月 (1月运)\n`;
  prompt += monthlyFormatter(horoscope, horoscope.monthly.index);

  if (focusArea) {
    prompt += `\n## 🎯 重点关注\n命主特别想了解: "${focusArea}"\n请重点针对此领域进行深入分析。\n`;
  }

  prompt += getFooter(focusArea);

  return prompt;
}

/**
 * 调用DeepSeek API进行解读
 */
export async function interpretAstrolabe(
  request: InterpretationRequest,
  onProgress?: (text: string) => void
): Promise<InterpretationResponse> {
  const config = getAIConfig();

  if (!config) {
    throw new Error("未配置AI密钥,请先在设置中配置");
  }

  const { apiKey, model, baseUrl } = config;
  const prompt = buildPrompt(request.astrolabeData, request.focusArea);
  const useStream = !!onProgress;

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: useStream,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
        `API请求失败: ${response.status} ${response.statusText}`
      );
    }

    if (!useStream) {
      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error("API返回数据格式错误");
      }
      const choice = data.choices[0];
      return {
        content: choice.message?.content || "",
        reasoning: choice.message?.reasoning_content,
        usage: data.usage
          ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
          : undefined,
      };
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法读取响应流");
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let fullReasoning = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr);
            const choice = data.choices?.[0];
            if (choice?.delta) {
              // deepseek-reasoner 可能会返回 reasoning_content
              if (choice.delta.reasoning_content) {
                fullReasoning += choice.delta.reasoning_content;
                // 如果需要实时显示推理过程，可以修改 onProgress 接口或通过特定格式传递
              }

              if (choice.delta.content) {
                const newContent = choice.delta.content;
                fullContent += newContent;
                onProgress(fullContent);
              }
            }
          } catch (e) {
            console.warn("解析流式数据失败:", e);
          }
        }
      }
    }

    return {
      content: fullContent,
      reasoning: fullReasoning,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("AI解读失败,请检查网络连接和API配置");
  }
}

/**
 * 测试API连接
 */
export async function testConnection(): Promise<boolean> {
  const config = getAIConfig();

  if (!config) {
    throw new Error("未配置AI密钥");
  }

  const { apiKey, baseUrl } = config;

  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
