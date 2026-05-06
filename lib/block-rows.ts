import type { ProposalBlock, BlockWidth } from "@/types/proposal";

const WIDTHS: Record<BlockWidth, number> = {
  full: 100,
  "two-thirds": 67,
  half: 50,
  "one-third": 33,
};

/** Group consecutive blocks into flex rows based on cumulative width.
 *  full-width blocks always start their own row.
 *  half+half = one row (100%), one-third×3 = one row (99%), two-thirds+one-third = one row (100%), etc.
 */
export function groupBlocksIntoRows(blocks: ProposalBlock[]): ProposalBlock[][] {
  const rows: ProposalBlock[][] = [];
  let row: ProposalBlock[] = [];
  let used = 0;

  for (const block of blocks) {
    const bw = WIDTHS[block.width as BlockWidth] ?? 100;
    if (bw === 100) {
      if (row.length) { rows.push(row); row = []; used = 0; }
      rows.push([block]);
    } else if (used + bw > 101) {
      // overflow: push current row, start new one
      if (row.length) rows.push(row);
      row = [block]; used = bw;
    } else {
      row.push(block); used += bw;
    }
  }
  if (row.length) rows.push(row);
  return rows;
}
