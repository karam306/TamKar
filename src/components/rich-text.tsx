/** Simple text formatting for pages: "## " starts a heading, empty lines split paragraphs. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={`space-y-4 leading-8 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines[0].startsWith("## ")) {
          return (
            <div key={i} className="space-y-2">
              <h2 className="text-xl text-text">{lines[0].slice(3)}</h2>
              {lines.length > 1 && <p>{lines.slice(1).map((l, j) => (j ? [<br key={j} />, l] : l))}</p>}
            </div>
          );
        }
        return <p key={i}>{lines.map((l, j) => (j ? [<br key={j} />, l] : l))}</p>;
      })}
    </div>
  );
}
