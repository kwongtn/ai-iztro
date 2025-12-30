import React from 'react';
import { Trash2, Upload, X } from 'lucide-react';
import dayjs from 'dayjs';

interface SavedChart {
    id: number;
    data: any;
    savedAt: string;
    name: string;
}

interface SavedChartsProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (chart: SavedChart) => void;
    onDelete: (id: number) => void;
    charts: SavedChart[];
}

export default function SavedCharts({ isOpen, onClose, onLoad, onDelete, charts }: SavedChartsProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        已保存的命盘
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
                    {charts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            暂无保存的命盘
                        </div>
                    ) : (
                        charts.map((chart) => (
                            <div
                                key={chart.id}
                                className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/10 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {chart.name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                        <span>{dayjs(chart.data.date).format('YYYY年MM月DD日')}</span>
                                        <span>•</span>
                                        <span>{chart.data.gender === 'male' ? '男' : '女'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onLoad(chart)}
                                        className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                        title="加载"
                                    >
                                        <Upload size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(chart.id)}
                                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
