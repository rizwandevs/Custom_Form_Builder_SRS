interface ChartPoint {
  date: string;
  count: number;
}

interface Props {
  data: ChartPoint[];
}

export default function SubmissionsChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-48 items-end gap-1 sm:gap-2">
      {data.map((point) => {
        const height = point.count === 0 ? 4 : Math.max(8, (point.count / max) * 100);
        const label = new Date(point.date + 'T12:00:00').toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        return (
          <div
            key={point.date}
            className="flex flex-1 flex-col items-center justify-end gap-1"
            title={`${label}: ${point.count} submission(s)`}
          >
            <span className="text-[10px] font-medium text-slate-600 sm:text-xs">
              {point.count > 0 ? point.count : ''}
            </span>
            <div
              className="w-full max-w-[28px] rounded-t-md bg-indigo-500 transition-all hover:bg-indigo-600"
              style={{ height: `${height}%` }}
            />
            <span className="mt-1 text-[9px] text-slate-400 sm:text-[10px]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
