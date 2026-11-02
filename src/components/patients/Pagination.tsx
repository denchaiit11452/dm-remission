import Link from "next/link";
import { formatRange } from "@/lib/format";
import { MAX_PAGE_SIZE, PAGE_SIZE, buildPatientQueryString, type PatientQuery } from "@/lib/patient-query";

type Props = { query: PatientQuery; page: number; pageSize: number; total: number };

const BTN =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const BTN_OFF = "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400";

/** Desktop/Tablet: ก่อนหน้า/ถัดไป  |  มือถือ: ปุ่มโหลดเพิ่ม (เพิ่มจำนวนต่อหน้าทีละ PAGE_SIZE) */
export default function Pagination({ query, page, pageSize, total }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const href = (overrides: Partial<PatientQuery>) => `/patients${buildPatientQueryString({ ...query, ...overrides })}`;

  const shown = Math.min(page * pageSize, total);
  const canLoadMore = shown < total && pageSize < MAX_PAGE_SIZE;
  const nextSize = Math.min(pageSize + PAGE_SIZE, MAX_PAGE_SIZE);

  return (
    <nav aria-label="แบ่งหน้า" className="mt-4">
      {/* มือถือ */}
      <div className="md:hidden">
        {canLoadMore ? (
          <Link href={href({ page: 1, pageSize: nextSize })} scroll={false} className={`${BTN} w-full`}>
            โหลดเพิ่ม (แสดง {shown} จาก {total})
          </Link>
        ) : (
          <p className="text-center text-sm text-slate-600">{total === 0 ? "" : `แสดงครบ ${total} ราย`}</p>
        )}
      </div>

      {/* แท็บเล็ต/คอมพิวเตอร์ */}
      <div className="hidden items-center justify-between gap-4 md:flex">
        <p className="text-sm text-slate-600">{formatRange(page, pageSize, total)}</p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className={BTN}>
              ก่อนหน้า
            </Link>
          ) : (
            <span aria-disabled="true" className={BTN_OFF}>
              ก่อนหน้า
            </span>
          )}
          {page < lastPage ? (
            <Link href={href({ page: page + 1 })} className={BTN}>
              ถัดไป
            </Link>
          ) : (
            <span aria-disabled="true" className={BTN_OFF}>
              ถัดไป
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
