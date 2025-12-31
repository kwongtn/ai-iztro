import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
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
import { SeparatorHorizontal, Trash2, GripVertical, ChevronLeft, ChevronRight, RotateCcw, Plus } from "lucide-react";

interface PromptCraftingProps {
    astrolabe: IFunctionalAstrolabe;
}
interface PromptItem {
    id: string;
    type: "decade" | "year" | "month" | "day" | "age" | "system" | "base_info" | "palaces" | "details" | "footer";
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
            case "system": return "系统提示词";
            case "base_info": return "基础信息";
            case "palaces": return "三方四正";
            case "details": return "十二宫详情";
            case "decade": return "大限";
            case "year": return "流年";
            case "age": return "小限";
            case "month": return "流月";
            case "day": return "流日";
            case "footer": return "结尾";
            default: return type;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center justify-between p-3 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-blue-500 transition-colors ${isDragging ? "ring-2 ring-blue-500" : ""
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
                    <div className="w-4 h-4" /> // Spacer
                )}
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {getTypeLabel(item.type)}
                    </span>
                </div>
            </div>
            <button
                onClick={() => onRemove(id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="移除"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export default function PromptCrafting({ astrolabe }: PromptCraftingProps) {
    const [items, setItems] = useState<PromptItem[]>([]);
    const [mode, setMode] = useState<"decade" | "year" | "month" | "day" | "age">("year");
    const [focusDate, setFocusDate] = useState(new Date());

    // Sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const getHoroscope = (date: Date) => {
        return astrolabe.horoscope(date, 0);
    };

    const getPreviewData = (date: Date, currentMode: "decade" | "year" | "month" | "day" | "age") => {
        const h = getHoroscope(date);
        try {
            if (currentMode === "decade") {
                const index = h.decadal.index;
                const decadalPalace = h.astrolabe.palace(index);
                const range = decadalPalace?.decadal.range ?? ["", ""];
                const label = `大限 ${range.join("-")} (虚岁) - ${decadalPalace?.name}`;
                const content = `\n### 大限 (10年运)\n` + decadalFormatter(h, index);
                return { label, content };
            } else if (currentMode === "year") {
                const year = h.yearly.heavenlyStem + h.yearly.earthlyBranch;
                const nominalAge = h.age.nominalAge;
                const label = `流年 ${year} (${nominalAge}岁)`;
                const content = `\n### 流年 (1年运: ${year}年)\n` + yearlyFormatter(h, h.yearly.index);
                return { label, content };
            } else if (currentMode === "age") {
                const nominalAge = h.age.nominalAge;
                const index = h.age.index;
                const palace = h.astrolabe.palace(index);
                const label = `小限 ${nominalAge}岁 - ${palace?.name}宫`;
                const content = `\n### 小限 (农历年运)\n` + ageFormatter(h, index);
                return { label, content };
            } else if (currentMode === 'day') {
                const day = h.daily.heavenlyStem + h.daily.earthlyBranch;
                const month = h.monthly.heavenlyStem + h.monthly.earthlyBranch;
                const label = `流日 ${month}月${day}日 - ${h.lunarDate}`;
                const content = `\n### 流日 (日运)\n` + dailyFormatter(h, h.daily.index);
                return { label, content };
            } else {
                const year = h.yearly.heavenlyStem + h.yearly.earthlyBranch;
                const month = h.monthly.heavenlyStem + h.monthly.earthlyBranch;
                const lunarMonth = h.lunarDate.slice(5, 7);
                const solarDate = h.solarDate.split("-");
                const solarMonth = solarDate[0] + "-" + solarDate[1].padStart(2, "0");
                const label = `流月 ${year}年${month}月 (${lunarMonth}) - ${solarMonth}`;
                const content = `\n### 流月 (1月运)\n` + monthlyFormatter(h, h.monthly.index);
                return { label, content };
            }
        } catch (e) {
            return { label: "Error", content: "Error generating content" };
        }
    };

    const preview = useMemo(() => getPreviewData(focusDate, mode), [focusDate, mode, astrolabe]);

    const handleModeChange = (newMode: "decade" | "year" | "month" | "day" | "age") => {
        setMode(newMode);
    };

    const shiftDate = (amount: number) => {
        let unit: dayjs.ManipulateType = 'year';
        let val = amount;
        if (mode === 'decade') { unit = 'year'; val = amount * 10; }
        else if (mode === 'year') { unit = 'year'; }
        else if (mode === 'age') { unit = 'year'; }
        else if (mode === 'month') { unit = 'month'; }
        else if (mode === 'day') { unit = 'day'; }
        setFocusDate(prev => dayjs(prev).add(val, unit).toDate());
    };

    const handleAddItem = (date: Date, currentMode: typeof mode) => {
        const { label, content } = getPreviewData(date, currentMode);
        setItems((prev) => [
            ...prev,
            { id: generateId(), type: currentMode, content, label },
        ]);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const addSpecialItem = (type: "system" | "base_info" | "palaces" | "details" | "footer") => {
        if (items.some(i => i.type === type)) return;

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

        setItems(prev => [...prev, { id: generateId(), type, content, label }]);
    };

    const addBatchItems = (count: number) => {
        const unit = mode === 'decade' ? 'year' : (mode === 'age' ? 'year' : mode === 'day' ? 'day' : mode);
        let lastDate = focusDate;
        const newItems: PromptItem[] = [];
        const isForward = count > 0;
        const absCount = Math.abs(count);

        for (let i = 1; i <= absCount; i++) {
            const val = mode === 'decade' ? i * 10 : i;
            const d = dayjs(focusDate).add(isForward ? val : -val, unit).toDate();
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

        setItems(prev => [...prev, ...newItems]);
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
            .filter(i => order.includes(i.type))
            .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    }, [items]);

    const dynamicItems = useMemo(() => {
        return items.filter(i => !["system", "base_info", "palaces", "details", "footer"].includes(i.type));
    }, [items]);

    const staticBottomItems = useMemo(() => {
        return items.filter(i => i.type === "footer");
    }, [items]);

    const fullPrompt = useMemo(() => {
        // Construct prompt in parsed order
        const all = [...staticTopItems, ...dynamicItems, ...staticBottomItems];
        return all.map((i) => i.content).join("\n");
    }, [staticTopItems, dynamicItems, staticBottomItems]);

    return (
        <div className="flex flex-col gap-6 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">

            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">AI 提示词工坊</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    添加基础元数据，组合流运信息，生成精准提示词
                </p>
            </div>

            {/* Base Info Helpers */}
            <section className="space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">基础元数据</div>
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'system', name: '系统提示词' },
                        { id: 'base_info', name: '基本信息' },
                        { id: 'palaces', name: '三方四正' },
                        { id: 'details', name: '十二宫' },
                        { id: 'footer', name: '结尾要求' }
                    ].map(btn => {
                        const exists = items.some(i => i.type === btn.id);
                        return (
                            <button
                                key={btn.id}
                                onClick={() => exists ? removeItem(items.find(i => i.type === btn.id)!.id) : addSpecialItem(btn.id as any)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${exists
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                    : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {exists ? <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> : <Plus size={12} />}
                                {btn.name}
                            </button>
                        )
                    })}
                </div>
            </section>

            <SeparatorHorizontal className="text-gray-100 dark:text-gray-800" />

            {/* Prompt Crafting Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">流运信息选择</h3>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-5 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {(["decade", "age", "year", "month", "day"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => handleModeChange(m)}
                            className={`py-2 px-1 rounded-md text-sm font-medium transition-all truncate ${mode === m
                                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                        >
                            {m === "decade" ? "大限" : m === "year" ? "流年" : m === "age" ? "小限" : m === "month" ? "流月" : "流日"}
                        </button>
                    ))}
                </div>

                {/* Navigation & Preview */}
                <div className="flex flex-col items-center gap-4 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    {/* Controls */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => shiftDate(-1)}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                            title="上一个"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <button
                            onClick={() => setFocusDate(new Date())}
                            className="px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                            回到当前
                        </button>

                        <button
                            onClick={() => shiftDate(1)}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                            title="下一个"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Preview Text */}
                    <div className="text-center">
                        <div className="text-xs text-gray-400 uppercase mb-1">Pending Selection</div>
                        <div className="text-lg font-bold text-gray-800 dark:text-white">
                            {preview.label}
                        </div>
                    </div>

                    {/* Convenience Buttons */}
                    <div className="flex flex-col gap-2 w-full px-4">
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => addBatchItems(-5)}
                                className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-600 dark:text-gray-200"
                            >
                                + 前5个
                            </button>
                            <button
                                onClick={() => addBatchItems(-3)}
                                className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-600 dark:text-gray-200"
                            >
                                + 前3个
                            </button>
                            <span>|</span>
                            <button
                                onClick={() => addBatchItems(3)}
                                className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-600 dark:text-gray-200"
                            >
                                + 后3个
                            </button>
                            <button
                                onClick={() => addBatchItems(5)}
                                className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-600 dark:text-gray-200"
                            >
                                + 后5个
                            </button>
                        </div>
                    </div>

                    {/* Main Add Button */}
                    <button
                        onClick={() => handleAddItem(focusDate, mode)}
                        className="w-4/5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        添加 {preview.label.split(' ')[0]}
                    </button>
                </div>
            </section>

            {/* List Section */}
            <section className="flex-1 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex justify-between items-center">
                    <span>已选项目 ({items.length})</span>
                    {items.length > 0 && (
                        <button onClick={() => setItems([])} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                            <RotateCcw size={12} /> 清空
                        </button>
                    )}
                </h3>

                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800 max-h-[400px]">
                    {/* Top Static Items */}
                    {staticTopItems.map(item => (
                        <SortableItem key={item.id} id={item.id} item={item} onRemove={removeItem} dragEnabled={false} />
                    ))}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={dynamicItems} strategy={verticalListSortingStrategy}>
                            {dynamicItems.length === 0 && staticTopItems.length === 0 && staticBottomItems.length === 0 ? (
                                <div className="h-full py-8 flex flex-col items-center justify-center text-gray-400 text-sm">
                                    <p>暂无内容</p>
                                    <p className="text-xs mt-1">请从上方添加基础信息或流运</p>
                                </div>
                            ) : (
                                dynamicItems.map(item => (
                                    <SortableItem key={item.id} id={item.id} item={item} onRemove={removeItem} />
                                ))
                            )}
                        </SortableContext>
                    </DndContext>

                    {/* Bottom Static Items */}
                    {staticBottomItems.map(item => (
                        <SortableItem key={item.id} id={item.id} item={item} onRemove={removeItem} dragEnabled={false} />
                    ))}
                </div>
            </section>

            {/* Output Section */}
            <section>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">生成的 Prompt</h3>
                    <button
                        onClick={() => navigator.clipboard.writeText(fullPrompt)}
                        className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        复制全部
                    </button>
                </div>
                <textarea
                    readOnly
                    value={fullPrompt}
                    rows={50}
                    className="w-full text-sm font-mono bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y text-gray-800 dark:text-gray-200"
                />
            </section>

        </div>
    );
}
