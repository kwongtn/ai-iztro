import { Trash2, Upload, X } from "lucide-react";
import dayjs from "dayjs";

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

export default function SavedCharts({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  charts,
}: SavedChartsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in w-full max-w-md rounded-2xl bg-white shadow-2xl duration-200 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            已保存的命盘
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar max-h-[60vh] space-y-3 overflow-y-auto p-6">
          {charts.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              暂无保存的命盘
            </div>
          ) : (
            charts.map((chart) => (
              <div
                key={chart.id}
                className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-purple-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-700/50 dark:hover:bg-purple-900/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {chart.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {dayjs(chart.data.date).format("YYYY年MM月DD日")}
                    </span>
                    <span>•</span>
                    <span>{chart.data.gender === "male" ? "男" : "女"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => onLoad(chart)}
                    className="rounded-lg p-2 text-purple-600 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    title="加载"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(chart.id)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
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
