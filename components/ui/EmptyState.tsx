export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-start gap-3 p-8">
      <div className="display text-[15px]">{title}</div>
      <p className="max-w-md text-[13px] text-muted">{body}</p>
      {action}
    </div>
  );
}
