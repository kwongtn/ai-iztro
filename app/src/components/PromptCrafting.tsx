import { useState, useMemo, useEffect } from "react";
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
import { SeparatorHorizontal, Trash2, GripVertical, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface PromptCraftingProps {
    astrolabe: IFunctionalAstrolabe;
}
interface PromptItem {
    id: string;
    // Added 'age' type
    type: "decade" | "year" | "month" | "day" | "age" | "base";
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
}: {
    id: string;
    item: PromptItem;
    onRemove: (id: string) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center justify-between p-3 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-blue-500 transition-colors ${isDragging ? "ring-2 ring-blue-500" : ""
                }`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                    <GripVertical size={16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {item.type === "base" ? "基础信息" : item.type === "decade" ? "大限" : item.type === "year" ? "流年" : item.type === "age" ? "小限" : item.type === "day" ? "流日" : "流月"}
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

    // Initialize with Base Info if empty?
    // Let's verify standard behavior. User might want to start fresh.
    // But usually we need the base chart info.
    // We'll add a "Add Base Info" button or check if we should default it.
    useEffect(() => {
        // Optional: Add base info by default if list is empty on mount?
        // For now, let's leave it empty or user manually adds everything.
        // The request says "list of elements that the user had selected".
        // I will add a special "Base Info" convenience button or just insert it at the start.
    }, []);

    const getHoroscope = (date: Date) => {
        return astrolabe.horoscope(date, 0); // Gender is fixed in astrolabe? standard usage
    };

    const getPreviewData = (date: Date, currentMode: "decade" | "year" | "month" | "day" | "age") => {
        const h = getHoroscope(date);
        try {
            if (currentMode === "decade") {
                // Find which decade we are in
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
                // Use daily formatter
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
        // Optionally reset focusDate to now or keep it?
        // Keep it seems better for continuity.
    };

    const shiftDate = (amount: number) => {
        let unit: dayjs.ManipulateType = 'year';
        let val = amount;

        if (mode === 'decade') {
            unit = 'year';
            val = amount * 10;
        } else if (mode === 'year') {
            unit = 'year';
        } else if (mode === 'age') {
            unit = 'year'; // Age changes yearly
        } else if (mode === 'month') {
            unit = 'month';
        } else if (mode === 'day') {
            unit = 'day';
        }

        setFocusDate(prev => dayjs(prev).add(val, unit).toDate());
    };

    const handleAddItem = (date: Date, currentMode: typeof mode) => {
        const { label, content } = getPreviewData(date, currentMode);
        setItems((prev) => [
            ...prev,
            {
                id: generateId(),
                type: currentMode,
                content,
                label,
            },
        ]);
    };

    // Add Base Info Helper
    const hasBaseInfo = items.some(i => i.type === 'base');
    const toggleBaseInfo = () => {
        if (hasBaseInfo) {
            setItems(prev => prev.filter(i => i.type !== 'base'));
        } else {
            const sys = getSystemPrompt();
            const info = getBaseInformationPrompt(astrolabe);
            const palaces = getPalacesPrompt(astrolabe);
            const h = astrolabe.horoscope(new Date(), 0);
            const details = getBasePalaceDetails(h);

            // We might want to separate these?
            // For simplicity, bundle them as "Base Info"
            const content = sys + '\n' + info + '\n' + palaces + '\n' + details;

            setItems(prev => [{
                id: generateId(),
                type: 'base',
                content,
                label: '基础命盘信息 (系统提示词 + 命盘 + 三方四正)'
            }, ...prev]);
        }
    }

    // Drag handlers
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

    const fullPrompt = useMemo(() => {
        const body = items.map((i) => i.content).join("\n");
        const footer = getFooter();
        // If base info is not in items, should we prepend it? 
        // The user requirement implies manual crafting.
        // But logically, we need the base info.
        // I made a button to add Base Info.
        // I will append footer always? Or is footer component dependent?
        // deepseekService builds prompt as: System + Base + Palaces + Times + Footer.
        // My 'base' item covers System + Base + Palaces.
        // So if users adds 'base', we are good.
        // The Footer is usually needed for the LLM to know what format to reply.
        // I will append Footer automatically at the end of the text area if not present?
        // Or just treat it as a hidden suffix? 
        // "Text area will display the AI prompt". 
        // I'll just append it to the text area value.
        return body + "\n" + footer;
    }, [items]);

    return (
        <div className="flex flex-col gap-6 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">

            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">AI 提示词工坊</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    自定义组合大限、流年、流月信息，生成专属分析提示词
                </p>
            </div>

            {/* Prompt Crafting Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">选择时间范围</h3>
                    <button
                        onClick={toggleBaseInfo}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${hasBaseInfo ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        {hasBaseInfo ? '已包含基础信息' : '+ 添加基础信息'}
                    </button>
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
                    <div className="flex flex-wrap justify-center gap-2 w-full px-4">
                        <button
                            onClick={() => {
                                const unit = mode === 'decade' ? 'year' : (mode === 'age' ? 'year' : mode === 'day' ? 'day' : mode);
                                const val = mode === 'decade' ? 10 : 1;
                                const prev1 = dayjs(focusDate).add(-val, unit);
                                const next1 = dayjs(focusDate).add(val, unit);
                                handleAddItem(prev1.toDate(), mode);
                                handleAddItem(next1.toDate(), mode);
                            }}
                            className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-600 dark:text-gray-200"
                        >
                            + 添加前1 & 后1
                        </button>
                        <button
                            onClick={() => {
                                const offsets = [-3, -2, -1, 1, 2, 3];
                                offsets.forEach(off => {
                                    const unit = mode === 'decade' ? 'year' : (mode === 'age' ? 'year' : mode === 'day' ? 'day' : mode);
                                    const val = mode === 'decade' ? off * 10 : off;
                                    const d = dayjs(focusDate).add(val, unit).toDate();
                                    handleAddItem(d, mode);
                                });
                            }}
                            className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-600 dark:text-gray-200"
                        >
                            + 添加前3 & 后3
                        </button>
                    </div>

                    {/* Main Add Button */}
                    <button
                        onClick={() => handleAddItem(focusDate, mode)}
                        className="w-4/5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                        添加到列表
                    </button>
                </div>
            </section>

            <SeparatorHorizontal className="text-gray-200 dark:text-gray-700 w-full" />

            {/* List Section */}
            <section className="flex-1 min-h-[200px] flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex justify-between items-center">
                    <span>已选项目 ({items.length})</span>
                    {items.length > 0 && (
                        <button onClick={() => setItems([])} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                            <RotateCcw size={12} /> 清空
                        </button>
                    )}
                </h3>

                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800 min-h-[150px]">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={items} strategy={verticalListSortingStrategy}>
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                    <p>列表为空</p>
                                    <p className="text-xs mt-1">请从上方添加内容</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <SortableItem key={item.id} id={item.id} item={item} onRemove={(id) => setItems(prev => prev.filter(x => x.id !== id))} />
                                ))
                            )}
                        </SortableContext>
                    </DndContext>
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
                    className="w-full h-[300px] p-3 text-sm font-mono bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y text-gray-800 dark:text-gray-200"
                />
            </section>

        </div>
    );
}
