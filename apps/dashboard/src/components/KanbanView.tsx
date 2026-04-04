export default function KanbanView() {
  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        src="https://gallegos-kanban.onrender.com/"
        className="border-0 origin-top-left"
        style={{
          width: "111.11%",
          height: "111.11%",
          transform: "scale(0.9)",
        }}
        title="Gallegos Kanban"
      />
    </div>
  );
}
