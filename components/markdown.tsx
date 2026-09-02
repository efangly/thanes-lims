import { Fragment, type ReactNode } from "react";

/**
 * Markdown renderer ขนาดเล็ก ไม่มี dependency — พอสำหรับคำตอบของ chatbot
 * (docs/chatbot-frontend-integration.md): ย่อหน้า, หัวข้อ, **ตัวหนา**, *เอียง*,
 * `code`, bullet / ตัวเลข list, GFM table, code block, ลิงก์
 *
 * ไม่ใช้ dangerouslySetInnerHTML — ทุกอย่างเป็น React element ปลอดภัยจาก HTML ที่ฝังมา
 */

/* ---------- inline ---------- */

function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  // เรียงตามความสำคัญ: code ก่อน (ไม่ตีความข้างใน), แล้ว bold, ลิงก์, italic
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-bg-2 px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("[")) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      nodes.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-teal-d underline"
        >
          {linkMatch[1]}
        </a>
      );
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

/* ---------- table ---------- */

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

const thCls =
  "whitespace-nowrap border-b border-line bg-bg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.5px] text-muted";
const tdCls = "border-b border-line px-3 py-2 align-top text-[12.5px]";

function Table({ lines }: { lines: string[] }) {
  const header = splitRow(lines[0]);
  const body = lines.slice(2).map(splitRow);
  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {header.map((c, i) => (
              <th key={i} className={thCls}>
                {renderInline(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.map((c, i) => (
                <td key={i} className={tdCls}>
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- block ---------- */

const isTableSep = (l: string) => /^\s*\|?[\s:|-]+\|[\s:|-]+$/.test(l) && l.includes("-");

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // code block
    if (line.trimStart().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // ปิด fence
      blocks.push(
        <pre
          key={key++}
          className="my-2 overflow-x-auto rounded-lg border border-line bg-bg-2 p-3 font-mono text-[12px] leading-relaxed"
        >
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    // heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const size = lvl <= 2 ? "text-[15px]" : "text-[13.5px]";
      blocks.push(
        <div key={key++} className={`mt-3 mb-1 font-semibold text-ink ${size}`}>
          {renderInline(h[2])}
        </div>
      );
      i++;
      continue;
    }

    // table: บรรทัดนี้มี | และบรรทัดถัดไปเป็น separator
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const tbl: string[] = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        tbl.push(lines[i]);
        i++;
      }
      blocks.push(<Table key={key++} lines={tbl} />);
      continue;
    }

    // list (bullet หรือ ตัวเลข) — เก็บ item ต่อเนื่อง
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ""));
        i++;
      }
      const cls = "my-2 flex flex-col gap-1 pl-5 text-[13px] leading-relaxed";
      blocks.push(
        ordered ? (
          <ol key={key++} className={`${cls} list-decimal`}>
            {items.map((it, x) => (
              <li key={x}>{renderInline(it)}</li>
            ))}
          </ol>
        ) : (
          <ul key={key++} className={`${cls} list-disc`}>
            {items.map((it, x) => (
              <li key={x}>{renderInline(it)}</li>
            ))}
          </ul>
        )
      );
      continue;
    }

    // paragraph — รวมบรรทัดติดกันจนเจอบรรทัดว่างหรือ block อื่น
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-1.5 text-[13px] leading-relaxed first:mt-0">
        {para.map((p, x) => (
          <Fragment key={x}>
            {x > 0 && <br />}
            {renderInline(p)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
