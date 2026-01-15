export default function Filters({ categories, selected, setSelected }) {
  return (
    <div className="filters">
      {categories.map(cat => (
        <button
          key={cat}
          onClick={()=>setSelected(cat)}
          className={selected===cat?"active":""}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
