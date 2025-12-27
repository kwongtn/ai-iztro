/**
 * DeepSeek API调用服务
 * 负责调用DeepSeek Chat Completion API进行排盘解读
 */

import type { IFunctionalAstrolabe } from "iztro/lib/astro/FunctionalAstrolabe";
import { getAIConfig } from "./aiConfig";
import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import type FunctionalStar from "iztro/lib/star/FunctionalStar";

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

export function baseInformation(astrolabe: IFunctionalAstrolabe) {
  let prompt = `## 📋 命主基本信息\n`;

  prompt += `- 性别: ${["male", "男"].includes(astrolabe.gender) ? "男" : "女"}\n`;
  prompt += `- 阳历: ${astrolabe.solarDate}\n`;
  prompt += `- 农历: ${astrolabe.lunarDate}\n`;
  prompt += `- 八字: ${astrolabe.chineseDate}\n`;
  prompt += `- 局数: ${astrolabe.fiveElementsClass}\n`;
  prompt += `- 命主: ${astrolabe.soul} | 身主: ${astrolabe.body}\n`;
  prompt += `- 星座: ${astrolabe.sign} | 生肖: ${astrolabe.zodiac}\n`;
  prompt += `- 命宫位置: ${astrolabe.earthlyBranchOfSoulPalace}宫 | 身宫位置: ${astrolabe.earthlyBranchOfBodyPalace}宫\n\n`;

  return prompt;
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

  let prompt = `你是一位经验丰富、通情达理的紫微斗数命理大师。请根据以下排盘数据，为命主提供一份既专业又通俗易懂的解读。\n\n`;
  prompt += `请注意：\n`;
  prompt += `1. **通俗易懂**：避免过多使用晦涩难懂的专业术语，如果必须使用，请配合大白话解释（例如："天机化禄"意味着什么，对日常生活具体有什么影响）。\n`;
  prompt += `2. **逻辑清晰**：不要罗列星曜含义，而是要综合全盘（三方四正）进行逻辑推演。\n`;
  prompt += `3. **全面细致**：不仅要看本宫，还要结合对宫、三合宫以及大限流年的走势。\n\n`;

  prompt += baseInformation(astrolabe);

  // Helper to format 三方四正
  function formatStarsSimple(p: IFunctionalPalace) {
    return p.majorStars
      ?.map(
        (s: FunctionalStar) => `${s.name}${s.brightness ? `[${s.brightness}]` : ""}`
      )
      .join(",") || "(空宫)";
  };

  // 三方四正 (命宫)
  if (astrolabe?.palaces) {
    const mingIndex = astrolabe.palaces.findIndex((p: any) => p.name === "命宫");
    if (mingIndex >= 0) {
      const sp = astrolabe.surroundedPalaces(mingIndex);
      if (sp) {
        prompt += `## 📐 三方四正 (命宫/先天格局)\n`;
        prompt += `这是命盘最核心的结构(三角形+对角线)，请重点分析：\n`;
        prompt += `- [本宫] 命宫 (${sp.target.heavenlyStem}${sp.target.earthlyBranch}): ${formatStarsSimple(sp.target)}\n`;
        prompt += `- [对宫] 迁移 (${sp.opposite.heavenlyStem}${sp.opposite.earthlyBranch}): ${formatStarsSimple(sp.opposite)}\n`;
        prompt += `- [三合] 财帛 (${sp.wealth.heavenlyStem}${sp.wealth.earthlyBranch}): ${formatStarsSimple(sp.wealth)}\n`;
        prompt += `- [三合] 官禄 (${sp.career.heavenlyStem}${sp.career.earthlyBranch}): ${formatStarsSimple(sp.career)}\n\n`;
      }
    }

    // 三方四正 (身宫) - 如果身宫和命宫不同，补充身宫信息
    const shenIndex = astrolabe.palaces.findIndex((p: any) => p.name === "身宫" || p.isBodyPalace);
    if (shenIndex >= 0 && shenIndex !== mingIndex) {
      const sp = astrolabe.surroundedPalaces(shenIndex);
      if (sp) {
        prompt += `## 🧘 身宫格局 (后天/中年后)\n`;
        prompt += `身宫代表后天发展和中年后的运势方向：\n`;
        prompt += `- [身宫] (${sp.target.heavenlyStem}${sp.target.earthlyBranch}): ${formatStarsSimple(sp.target)}\n`;
        prompt += `- [对宫] (${sp.opposite.heavenlyStem}${sp.opposite.earthlyBranch}): ${formatStarsSimple(sp.opposite)}\n`;
        prompt += `- [三合] 财帛 (${sp.wealth.heavenlyStem}${sp.wealth.earthlyBranch}): ${formatStarsSimple(sp.wealth)}\n`;
        prompt += `- [三合] 官禄 (${sp.career.heavenlyStem}${sp.career.earthlyBranch}): ${formatStarsSimple(sp.career)}\n\n`;
      }
    }
  }

  // 十二宫信息
  if (astrolabe?.palaces) {
    prompt += `## 🏰 十二宫详细配置\n`;
    astrolabe.palaces.forEach((palace: IFunctionalPalace, index: number) => {
      prompt += `\n### 【${palace.name}宫】 (地支:${palace.earthlyBranch} | 天干:${palace.heavenlyStem})\n`;

      // 格式化星曜显示 helper
      function formatStar(s: FunctionalStar) {
        return `${s.name}${s.mutagen ? `(${s.mutagen})` : ""}${s.brightness ? `[${s.brightness}]` : ""
          }`;
      }

      // 主星
      const majorStars = palace.majorStars || [];
      if (majorStars.length > 0) {
        prompt += `🔴 主星: ${majorStars.map(formatStar).join(", ")}\n`;
      } else {
        prompt += `🔴 主星: (空宫)\n`;
      }

      // 辅星
      if (palace.minorStars?.length > 0) {
        prompt += `🔵 辅星: ${palace.minorStars.map(formatStar).join(", ")}\n`;
      }

      // 杂曜
      if (palace.adjectiveStars?.length > 0) {
        prompt += `⚪ 杂曜: ${palace.adjectiveStars
          .map(formatStar)
          .join(", ")}\n`;
      }

      // 神煞/流曜 (包括原局神煞 + 大限/流年流曜)
      const otherStars = [];
      // 原局神煞
      if (palace.changsheng12) otherStars.push(`长生12:${palace.changsheng12}`);
      if (palace.boshi12) otherStars.push(`博士12:${palace.boshi12}`);
      if (palace.jiangqian12) otherStars.push(`将前12:${palace.jiangqian12}`);
      if (palace.suiqian12) otherStars.push(`岁前12:${palace.suiqian12}`);

      // 运限流曜 (从horoscope中获取)
      if (horoscope) {
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
      }

      if (otherStars.length > 0) {
        prompt += `✨ 其他神煞: ${otherStars.join(" | ")}\n`;
      }

      // 小限与大限时间 (对应UI显示)
      if (palace.ages || palace.decadal) {
        const limits = [];
        if (palace.ages) limits.push(`小限: ${palace.ages.join(" ")}`);
        if (palace.decadal?.range)
          limits.push(`大限: ${palace.decadal.range.join(" - ")}`);
        if (limits.length > 0) {
          prompt += `📅 运限时间: ${limits.join(" | ")}\n`;
        }
      }
    });
  }

  // 运限信息
  prompt += `\n## ⏳ 运限走势\n`;
  const decadalPalace = astrolabe.palace(horoscope.decadal.index);
  if (decadalPalace) {
    prompt += `### 当前大限 (10年运)\n`;
    prompt += `- 大限位置: ${decadalPalace.name}宫\n`;
    prompt += `- 大限时间: ${decadalPalace.decadal.range?.join(" - ") || ""
      } (虚岁)\n`;
    prompt += `- 大限四化: ${horoscope.decadal.mutagen?.join(", ") || "无"}\n`;

    // 大限三方四正
    const sp = astrolabe.surroundedPalaces(horoscope.decadal.index);
    if (sp) {
      prompt += `- 大限三方四正:\n`;
      prompt += `  * 本宫: ${formatStarsSimple(sp.target)} (${sp.target.name})\n`;
      prompt += `  * 对宫: ${formatStarsSimple(sp.opposite)} (${sp.opposite.name})\n`;
      prompt += `  * 三合(财/官): ${formatStarsSimple(sp.wealth)} (${sp.wealth.name}) | ${formatStarsSimple(sp.career)} (${sp.career.name})\n`;
    }
  }

  const yearlyPalace = astrolabe.palace(horoscope.yearly.index) as IFunctionalPalace;
  if (horoscope?.yearly) {
    prompt += `\n### 当前流年 (1年运)\n`;
    prompt += `- 流年位置: ${yearlyPalace.name}宫\n`;
    // horoscope.yearly.year 可能是undefined, 使用天干地支代替或标注当前时间
    prompt += `- 流年时间: ${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch
      }年 (公历${new Date().getFullYear()}年)\n`;
    prompt += `- 命主虚岁: ${horoscope.age?.nominalAge}岁\n`;
    prompt += `- 流年四化: ${horoscope.yearly.mutagen?.join(", ") || "无"}\n`;

    // 流年三方四正
    const sp = astrolabe.surroundedPalaces(horoscope.yearly.index);
    if (sp) {
      prompt += `- 流年三方四正:\n`;
      prompt += `  * 本宫: ${formatStarsSimple(sp.target)} (${sp.target.name})\n`;
      prompt += `  * 对宫: ${formatStarsSimple(sp.opposite)} (${sp.opposite.name})\n`;
      prompt += `  * 三合(财/官): ${formatStarsSimple(sp.wealth)} (${sp.wealth.name}) | ${formatStarsSimple(sp.career)} (${sp.career.name})\n`;
    }
  }

  const monthlyPalace = astrolabe.palace(horoscope.monthly.index) as IFunctionalPalace;
  if (horoscope?.monthly) {
    prompt += `\n### 当前流月 (1月运)\n`;
    prompt += `- 流月位置: ${monthlyPalace.name}宫\n`;
    // horoscope.yearly.year 可能是undefined, 使用天干地支代替或标注当前时间
    prompt += `- 流月时间: ${horoscope.monthly.heavenlyStem}${horoscope.monthly.earthlyBranch
      }年${horoscope.lunarDate.slice(5, 7)}\n`;
    prompt += `- 流月四化: ${horoscope.monthly.mutagen?.join(", ") || "无"}\n`;
  }

  // 流月三方四正
  const sp = astrolabe.surroundedPalaces(horoscope.monthly.index);
  if (sp) {
    prompt += `- 流月三方四正:\n`;
    prompt += `  * 本宫: ${formatStarsSimple(sp.target)} (${sp.target.name})\n`;
    prompt += `  * 对宫: ${formatStarsSimple(sp.opposite)} (${sp.opposite.name})\n`;
    prompt += `  * 三合(财/官): ${formatStarsSimple(sp.wealth)} (${sp.wealth.name}) | ${formatStarsSimple(sp.career)} (${sp.career.name})\n`;
  }

  if (focusArea) {
    prompt += `\n## 🎯 重点关注\n命主特别想了解: "${focusArea}"\n请重点针对此领域进行深入分析。\n`;
  }

  prompt += `\n## 📝 解读框架\n`;
  prompt += `请按照以下结构进行回复（语言要温暖、有力量，多给建设性意见）：\n`;
  prompt += `1. **核心格局**：一句话概括命盘最大的特点（如"杀破狼变格"、"机月同梁"等），并解释这意味着什么。\n`;
  prompt += `2. **性格画像**：优点和盲点各是什么？（用心理学视角的词汇，如"执行力强但容易冲动"）。\n`;
  prompt += `3. **${focusArea ? "重点解答" : "重点分析"
    }**：针对命主最关心的问题（或事业财运）进行详细剖析。\n`;
  prompt += `4. **运势指引**：结合大限流年流月，指出当下的机遇和风险。\n`;
  prompt += `5. **大师锦囊**：给出一两个切实可行的行动建议（如"适合从事...行业"、"今年/这个月注意..."）。\n`;
  prompt += `6. **详情询问**：如果还有其他问题，请直接询问，以达到更深入的分析。\n`;
  prompt += `7. **结束语**：以当前流年流月总结并鼓励命主。可做四句诗。\n`;

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
