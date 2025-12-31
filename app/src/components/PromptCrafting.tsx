import { useState, useMemo } from "react";
import dayjs from "dayjs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IFunctionalAstrolabe } from "iztro/lib/astro/FunctionalAstrolabe";
import {
  decadalFormatter,
  yearlyFormatter,
  monthlyFormatter,
  dailyFormatter,
  ageFormatter,
  getSystemPrompt,
  getBaseInformationPrompt,
  getPalacesPrompt,
  getFooter,
  getBasePalaceDetails,
} from "../services/deepseekService";
import {
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
} from "lucide-react";

interface PromptCraftingProps {
  astrolabe: IFunctionalAstrolabe;
}
interface PromptItem {
  id: string;
  type:
    | "decade"
    | "year"
    | "month"
    | "day"
    | "age"
    | "system"
    | "base_info"
    | "palaces"
    | "details"
    | "footer";
  content: string;
  label: string;
  sortIndex?: number;
}

// Ensure unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const SortableItem = ({
  id,
  item,
  onRemove,
  dragEnabled = true,
}: {
  id: string;
  item: PromptItem;
  onRemove: (id: string) => void;
  dragEnabled?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeLabel = (type: PromptItem["type"]) => {
    switch (type) {
      case "system":
        return "系统提示词";
      case "base_info":
        return "基础信息";
      case "palaces":
        return "三方四正";
      case "details":
        return "十二宫详情";
      case "decade":
        return "大限";
      case "year":
        return "流年";
      case "age":
        return "小限";
      case "month":
        return "流月";
      case "day":
        return "流日";
      case "footer":
        return "结尾";
      default:
        return type;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group mb-2 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 ${
        isDragging ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {dragEnabled ? (
          <div
            {...attributes}
            {...listeners}
            className="cursor-move text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <GripVertical size={16} />
          </div>
        ) : (
          <div className="h-4 w-4" /> // Spacer
        )}
        <div className="flex flex-col">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.label}
          </span>
          <span className="text-xs text-gray-500 capitalize dark:text-gray-400">
            {getTypeLabel(item.type)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onRemove(id)}
        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        title="移除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default function PromptCrafting({ astrolabe }: PromptCraftingProps) {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [mode, setMode] = useState<"decade" | "year" | "month" | "day" | "age">(
    "year",
  );
  const [focusDate, setFocusDate] = useState(new Date());

  // Check if focusDate is effectively "current" based on mode
  const isCurrent = useMemo(() => {
    const now = new Date();
    const focus = focusDate;

    // Compare based on the granularity of the current mode
    if (mode === "day") {
      // Same day
      return dayjs(focus).isSame(now, "day");
    } else if (mode === "month") {
      // Same month
      return dayjs(focus).isSame(now, "month");
    } else {
      // For year, age, decade - same year
      return dayjs(focus).isSame(now, "year");
    }
  }, [focusDate, mode]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getHoroscope = (date: Date) => {
    return astrolabe.horoscope(date, 0);
  };

  const getPreviewData = (
    date: Date,
    currentMode: "decade" | "year" | "month" | "day" | "age",
  ) => {
    const h = getHoroscope(date);
    // Format solarDate with padded month and day
    const formatSolarDate = (solarDate: string) => {
      const parts = solarDate.split("-");
      if (parts.length === 3) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      }
      return solarDate;
    };
    try {
      if (currentMode === "decade") {
        const index = h.decadal.index;
        const decadalPalace = h.astrolabe.palace(index);
        const range = decadalPalace?.decadal.range ?? ["", ""];
        const label = `大限 ${range.join("-")} (虚岁) - ${decadalPalace?.name}`;
        const content = `\n### 大限 (10年运)\n` + decadalFormatter(h, index);
        const sublabel = formatSolarDate(h.solarDate);
        return { label, content, sublabel };
      } else if (currentMode === "year") {
        const year = h.yearly.heavenlyStem + h.yearly.earthlyBranch;
        const nominalAge = h.age.nominalAge;
        const label = `流年 ${year} (${nominalAge}岁)`;
        const content =
          `\n### 流年 (1年运: ${year}年)\n` +
          yearlyFormatter(h, h.yearly.index);
        const sublabel = formatSolarDate(h.solarDate);
        return { label, content, sublabel };
      } else if (currentMode === "age") {
        const nominalAge = h.age.nominalAge;
        const index = h.age.index;
        const palace = h.astrolabe.palace(index);
        const label = `小限 ${nominalAge}岁 - ${palace?.name}宫`;
        const content = `\n### 小限 (农历年运)\n` + ageFormatter(h, index);
        const sublabel = formatSolarDate(h.solarDate);
        return { label, content, sublabel };
      } else if (currentMode === "day") {
        const day = h.daily.heavenlyStem + h.daily.earthlyBranch;
        const month = h.monthly.heavenlyStem + h.monthly.earthlyBranch;
        const label = `流日 ${month}月${day}日 - ${h.lunarDate}`;
        const content =
          `\n### 流日 (日运)\n` + dailyFormatter(h, h.daily.index);
        const sublabel = formatSolarDate(h.solarDate);
        return { label, content, sublabel };
      } else {
        const year = h.yearly.heavenlyStem + h.yearly.earthlyBranch;
        const month = h.monthly.heavenlyStem + h.monthly.earthlyBranch;
        const lunarMonth = h.lunarDate.slice(5, 7);
        const solarDate = h.solarDate.split("-");
        const solarMonth = solarDate[0] + "-" + solarDate[1].padStart(2, "0");
        const label = `流月 ${year}年${month}月 (${lunarMonth}) - ${solarMonth}`;
        const content =
          `\n### 流月 (1月运)\n` + monthlyFormatter(h, h.monthly.index);
        const sublabel = formatSolarDate(h.solarDate);
        return { label, content, sublabel };
      }
    } catch (e) {
      return {
        label: "Error",
        content: "Error generating content",
        sublabel: "",
      };
    }
  };

  const preview = useMemo(
    () => getPreviewData(focusDate, mode),
    [focusDate, mode, astrolabe],
  );

  const handleModeChange = (
    newMode: "decade" | "year" | "month" | "day" | "age",
  ) => {
    setMode(newMode);
  };

  const shiftDate = (amount: number) => {
    let unit: dayjs.ManipulateType = "year";
    let val = amount;
    if (mode === "decade") {
      unit = "year";
      val = amount * 10;
    } else if (mode === "year") {
      unit = "year";
    } else if (mode === "age") {
      unit = "year";
    } else if (mode === "month") {
      unit = "month";
    } else if (mode === "day") {
      unit = "day";
    }
    setFocusDate((prev) => dayjs(prev).add(val, unit).toDate());
  };

  const handleAddItem = (date: Date, currentMode: typeof mode) => {
    const { label, content } = getPreviewData(date, currentMode);
    setItems((prev) => [
      ...prev,
      { id: generateId(), type: currentMode, content, label },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addSpecialItem = (
    type: "system" | "base_info" | "palaces" | "details" | "footer",
  ) => {
    if (items.some((i) => i.type === type)) return;

    let content = "";
    let label = "";

    switch (type) {
      case "system":
        content = getSystemPrompt();
        label = "系统提示词 (System Prompt)";
        break;
      case "base_info":
        content = getBaseInformationPrompt(astrolabe);
        label = "基本信息 (性别/生肖/局数)";
        break;
      case "palaces":
        content = getPalacesPrompt(astrolabe);
        label = "三方四正 (核心格局)";
        break;
      case "details":
        const h = astrolabe.horoscope(new Date(), 0);
        content = getBasePalaceDetails(h);
        label = "十二宫详细信息";
        break;
      case "footer":
        content = getFooter();
        label = "输出要求 (Footer)";
        break;
    }

    setItems((prev) => [...prev, { id: generateId(), type, content, label }]);
  };

  const addBatchItems = (count: number) => {
    const unit =
      mode === "decade"
        ? "year"
        : mode === "age"
          ? "year"
          : mode === "day"
            ? "day"
            : mode;
    let lastDate = focusDate;
    const newItems: PromptItem[] = [];
    const isForward = count > 0;
    const absCount = Math.abs(count);

    for (let i = 1; i <= absCount; i++) {
      const val = mode === "decade" ? i * 10 : i;
      const d = dayjs(focusDate)
        .add(isForward ? val : -val, unit)
        .toDate();
      const { label, content } = getPreviewData(d, mode);
      newItems.push({
        id: generateId(),
        type: mode,
        content,
        label,
      });
      if (i === absCount) lastDate = d;
    }

    // If going backwards, we typically want them in reverse chronological order in the list?
    // Or chronological?
    // If I say "Previous 3", and I am at 2024. I want 2023, 2022, 2021.
    // The loop above generates 2023 (i=1), 2022 (i=2), 2021 (i=3).
    // If I just push them, they will appear as [2023, 2022, 2021].
    // Usually we want chronological in the list: 2021, 2022, 2023.
    // So if backwards, reverse the batch?
    // But the user's previous code just pushed them. I'll stick to pushing them for now,
    // but maybe reverse if it's backwards to make it logical?
    // Lets just push them as they are generated (closest to furthest) or furthest to closest?
    // Previous implementation:
    // Prev 5 loop i=1 to 5. d = add(-val). push.
    // So it pushed [Current-1, Current-2, Current-3...].
    // I will keep that behavior.

    setItems((prev) => [...prev, ...newItems]);
    setFocusDate(lastDate);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Split items for rendering
  const staticTopItems = useMemo(() => {
    const order = ["system", "base_info", "palaces", "details"];
    return items
      .filter((i) => order.includes(i.type))
      .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  }, [items]);

  const dynamicItems = useMemo(() => {
    return items.filter(
      (i) =>
        !["system", "base_info", "palaces", "details", "footer"].includes(
          i.type,
        ),
    );
  }, [items]);

  const staticBottomItems = useMemo(() => {
    return items.filter((i) => i.type === "footer");
  }, [items]);

  const fullPrompt = useMemo(() => {
    // Construct prompt in parsed order
    const all = [...staticTopItems, ...dynamicItems, ...staticBottomItems];
    return all.map((i) => i.content).join("\n");
  }, [staticTopItems, dynamicItems, staticBottomItems]);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            AI 提示词工坊
          </span>
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          添加基础元数据，组合流运信息，生成精准提示词
        </p>
      </div>

      {/* Base Info Helpers */}
      <section className="space-y-2">
        <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          基础元数据
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "system", name: "系统提示词" },
            { id: "base_info", name: "基本信息" },
            { id: "palaces", name: "三方四正" },
            { id: "details", name: "十二宫" },
            { id: "footer", name: "结尾要求" },
          ].map((btn) => {
            const exists = items.some((i) => i.type === btn.id);
            return (
              <button
                key={btn.id}
                onClick={() =>
                  exists
                    ? removeItem(items.find((i) => i.type === btn.id)!.id)
                    : addSpecialItem(btn.id as any)
                }
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  exists
                    ? "border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {exists ? (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                ) : (
                  <Plus size={12} />
                )}
                {btn.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Prompt Crafting Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            流运信息选择
          </h3>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-5 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(["decade", "age", "year", "month", "day"] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`truncate rounded-md px-1 py-2 text-sm font-medium transition-all ${
                mode === m
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {m === "decade"
                ? "大限"
                : m === "year"
                  ? "流年"
                  : m === "age"
                    ? "小限"
                    : m === "month"
                      ? "流月"
                      : "流日"}
            </button>
          ))}
        </div>

        {/* Navigation & Preview */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 py-4 dark:border-gray-800 dark:bg-gray-800/50">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => shiftDate(-1)}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              title="上一个"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => setFocusDate(new Date())}
              disabled={isCurrent}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                isCurrent
                  ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
              }`}
            >
              回到当前
            </button>

            <button
              onClick={() => shiftDate(1)}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              title="下一个"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Preview Text */}
          <div className="text-center">
            <div className="mb-1 text-xs text-gray-400 uppercase">
              {preview.sublabel}
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {preview.label}
            </div>
          </div>

          {/* Convenience Buttons */}
          <div className="flex w-full flex-col gap-2 px-4">
            <div className="flex justify-center gap-2">
              <button
                onClick={() => addBatchItems(-5)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-500"
              >
                + 前5个
              </button>
              <button
                onClick={() => addBatchItems(-3)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-500"
              >
                + 前3个
              </button>
              <span>|</span>
              <button
                onClick={() => addBatchItems(3)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-500"
              >
                + 后3个
              </button>
              <button
                onClick={() => addBatchItems(5)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-500"
              >
                + 后5个
              </button>
            </div>
          </div>

          {/* Main Add Button */}
          <button
            onClick={() => handleAddItem(focusDate, mode)}
            className="flex w-4/5 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus size={18} />
            添加 {preview.label.split(" ")[0]}
          </button>
        </div>
      </section>

      {/* List Section */}
      <section className="flex flex-1 flex-col">
        <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span>已选项目 ({items.length})</span>
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
            >
              <RotateCcw size={12} /> 清空
            </button>
          )}
        </h3>

        <div className="max-h-[400px] flex-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
          {/* Top Static Items */}
          {staticTopItems.map((item) => (
            <SortableItem
              key={item.id}
              id={item.id}
              item={item}
              onRemove={removeItem}
              dragEnabled={false}
            />
          ))}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dynamicItems}
              strategy={verticalListSortingStrategy}
            >
              {dynamicItems.length === 0 &&
              staticTopItems.length === 0 &&
              staticBottomItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-8 text-sm text-gray-400">
                  <p>暂无内容</p>
                  <p className="mt-1 text-xs">请从上方添加基础信息或流运</p>
                </div>
              ) : (
                dynamicItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    item={item}
                    onRemove={removeItem}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>

          {/* Bottom Static Items */}
          {staticBottomItems.map((item) => (
            <SortableItem
              key={item.id}
              id={item.id}
              item={item}
              onRemove={removeItem}
              dragEnabled={false}
            />
          ))}
        </div>
      </section>

      {/* Output Section */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            生成的 Prompt
          </h3>
          {fullPrompt && (
            <button
              onClick={() => navigator.clipboard.writeText(fullPrompt)}
              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              复制全部
            </button>
          )}
        </div>
        {!fullPrompt ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-8 dark:border-gray-800 dark:bg-gray-900/50">
            <p className="text-sm text-gray-400">暂无内容</p>
            <p className="mt-1 text-xs text-gray-400">
              请从上方添加基础信息或流运
            </p>
          </div>
        ) : (
          <textarea
            readOnly
            value={fullPrompt}
            rows={50}
            className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 font-mono text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          />
        )}
      </section>
    </div>
  );
}
