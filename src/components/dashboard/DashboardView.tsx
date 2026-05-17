import BookFrame from "@/components/dashboard/BookFrame";
import Button from "@/components/dashboard/Button";
import HorizontalScroll from "@/components/dashboard/HorizontalScroll";
import InviteContributorsButton from "@/components/dashboard/InviteContributorsButton";

const books = [
  {
    title: "Early Childhood",
    dateRange: "1999-2007",
    coverImages: ["/dashboard/photo-1.png"],
  },
  {
    title: "Early Childhood",
    dateRange: "1999-2007",
    coverImages: ["/dashboard/photo-1.png", "/dashboard/photo-2.png"],
  },
  {
    title: "Early Childhood",
    dateRange: "1999-2007",
    coverImages: ["/dashboard/photo-1.png"],
  },
  {
    title: "Early Childhood",
    dateRange: "1999-2007",
    coverImages: ["/dashboard/photo-1.png"],
  },
];

export default function DashboardView() {
  return (
    <HorizontalScroll
      className="fixed inset-0 flex flex-col justify-center gap-0 overflow-x-hidden bg-cream-50 py-16 text-ink"
      viewportClassName="min-h-0 flex h-full w-full flex-1 overflow-x-auto overscroll-x-contain scrollbar-hide"
      header={
        <header className="flex w-full shrink-0 items-start justify-between px-32">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="font-hand text-[32px] leading-normal text-ink">
                Andy&apos;s Life
              </h1>
              <p className="text-2xl font-light leading-normal text-muted">
                1999 - Present
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InviteContributorsButton />
            <Button text="Profile" />
          </div>
        </header>
      }
    >
      <section className="flex w-max gap-12 px-32">
        {books.map((book, index) => (
          <BookFrame
            key={`${book.title}-${index}`}
            title={book.title}
            dateRange={book.dateRange}
            coverImages={book.coverImages}
          />
        ))}
      </section>
    </HorizontalScroll>
  );
}
