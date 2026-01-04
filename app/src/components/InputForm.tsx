import {
  Calendar,
  ChevronDown,
  Download,
  Save,
  Settings,
  Sparkles,
  Github,
  List,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

interface InputFormProps {
  onSubmit: (data: any) => void;
  onAIInterpret?: () => void;
  onOpenSettings?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  onShowSaved?: () => void;
  values?: any;
}

export default function InputForm({
  onSubmit,
  onAIInterpret,
  onOpenSettings,
  onDownload,
  onSave,
  onShowSaved,
  values,
}: InputFormProps) {
  const [formData, setFormData] = useState({
    dateType: "solar", // solar or lunar
    date: dayjs().format("YYYY-MM-DD"),
    time: 0,
    gender: "male",
    name: "",
    leap: false,
  });

  // Sync form data with incoming values
  useEffect(() => {
    if (values) {
      setFormData((prev) => ({
        ...prev,
        ...values,
        // Ensure name is preserved or defaults to empty string if not in values
        name: values.name || prev.name || "",
      }));
    }
  }, [values]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // 时辰选项 - 使用时辰索引（0-11）
  // iztro 库需要的是时辰索引，而非小时值
  const timeOptions = [
    { value: 0, label: "子 23:00-01:00" }, // 早子时，索引0
    { value: 1, label: "丑 01:00-03:00" }, // 丑时，索引1
    { value: 2, label: "寅 03:00-05:00" }, // 寅时，索引2
    { value: 3, label: "卯 05:00-07:00" }, // 卯时，索引3
    { value: 4, label: "辰 07:00-09:00" }, // 辰时，索引4
    { value: 5, label: "巳 09:00-11:00" }, // 巳时，索引5
    { value: 6, label: "午 11:00-13:00" }, // 午时，索引6
    { value: 7, label: "未 13:00-15:00" }, // 未时，索引7
    { value: 8, label: "申 15:00-17:00" }, // 申时，索引8
    { value: 9, label: "酉 17:00-19:00" }, // 酉时，索引9
    { value: 10, label: "戌 19:00-21:00" }, // 戌时，索引10
    { value: 11, label: "亥 21:00-23:00" }, // 亥时，索引11
  ];

  return (
    <div className="flex h-auto w-full flex-col border-t border-gray-200 bg-white p-4 md:h-full md:w-80 md:overflow-y-auto md:border-t-0 md:border-l md:p-6 dark:border-gray-700 dark:bg-gray-800">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">
            日期类型
          </label>
          <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-sm transition-colors ${
                formData.dateType === "solar"
                  ? "bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              onClick={() => setFormData({ ...formData, dateType: "solar" })}
            >
              阳历
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-sm transition-colors ${
                formData.dateType === "lunar"
                  ? "bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              onClick={() => setFormData({ ...formData, dateType: "lunar" })}
            >
              农历
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">
            生日
          </label>
          <div className="relative">
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <Calendar
              className="absolute top-2.5 left-3 text-gray-400 dark:text-gray-500"
              size={16}
            />
          </div>
          {formData.dateType === "lunar" && (
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={formData.leap}
                onChange={(e) =>
                  setFormData({ ...formData, leap: e.target.checked })
                }
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                闰月
              </span>
            </label>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">
            时辰
          </label>
          <div className="relative">
            <select
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: parseInt(e.target.value) })
              }
              className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pr-10 pl-4 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute top-2.5 right-3 text-gray-400"
              size={16}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">
            性别
          </label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === "male"}
                onChange={() => setFormData({ ...formData, gender: "male" })}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                男
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === "female"}
                onChange={() => setFormData({ ...formData, gender: "female" })}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                女
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">
            名字
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入姓名"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white shadow-lg shadow-purple-200 transition-colors hover:bg-purple-700 dark:shadow-purple-900/20"
        >
          排 盘
        </button>
      </form>

      <div className="mt-8 grid grid-cols-4 gap-4">
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 text-xs text-gray-500 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
        >
          <div className="rounded-lg bg-gray-50 p-2 hover:bg-purple-50 dark:bg-gray-700 dark:hover:bg-purple-900/30">
            <Settings size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span>设置</span>
        </button>
        <button
          onClick={onDownload}
          className="flex flex-col items-center gap-1 text-xs text-gray-500 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
        >
          <div className="rounded-lg bg-gray-50 p-2 hover:bg-purple-50 dark:bg-gray-700 dark:hover:bg-purple-900/30">
            <Download size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span>下载</span>
        </button>
        <button
          onClick={onSave}
          className="flex flex-col items-center gap-1 text-xs text-gray-500 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
        >
          <div className="rounded-lg bg-gray-50 p-2 hover:bg-purple-50 dark:bg-gray-700 dark:hover:bg-purple-900/30">
            <Save size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span>保存</span>
        </button>
        <button
          onClick={onShowSaved}
          className="flex flex-col items-center gap-1 text-xs text-gray-500 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
        >
          <div className="rounded-lg bg-gray-50 p-2 hover:bg-purple-50 dark:bg-gray-700 dark:hover:bg-purple-900/30">
            <List size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span>记录</span>
        </button>
      </div>

      {/* AI解读按钮 */}
      <button
        onClick={onAIInterpret}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-medium text-white shadow-lg shadow-purple-200 transition-all hover:from-purple-700 hover:to-pink-700 dark:shadow-purple-900/20"
      >
        <Sparkles size={18} />
        <span>AI 解读命盘</span>
      </button>

      <div className="mt-auto border-t border-gray-100 pt-6 dark:border-gray-800">
        <a
          href="https://github.com/kwongtn/ai-iztro"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Github size={14} />
          <span>Open Source on GitHub</span>
        </a>
      </div>
    </div>
  );
}
