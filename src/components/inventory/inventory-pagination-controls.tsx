import * as React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function buildPageItems(current: number, total: number) {
  if (total <= 1) return [1];

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const safeCurrent = Math.min(Math.max(1, current), total);
  const left = Math.max(2, safeCurrent - 1);
  const right = Math.min(total - 1, safeCurrent + 1);
  const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];

  if (left > 2) {
    pages.push("ellipsis-left");
  }

  for (let pageNumber = left; pageNumber <= right; pageNumber += 1) {
    pages.push(pageNumber);
  }

  if (right < total - 1) {
    pages.push("ellipsis-right");
  }

  pages.push(total);
  return pages;
}

type InventoryPaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function InventoryPaginationControlsInner({
  page,
  totalPages,
  onPageChange,
}: InventoryPaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className="pt-2">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={page === 1}
            className={
              page === 1
                ? "pointer-events-none h-10 gap-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-40"
                : "h-10 gap-2 px-3 text-xs font-semibold uppercase tracking-[0.12em]"
            }
            onClick={(event) => {
              event.preventDefault();
              if (page === 1) return;
              onPageChange(Math.max(1, page - 1));
            }}
          />
        </PaginationItem>

        {buildPageItems(page, totalPages).map((entry, index) =>
          typeof entry === "number" ? (
            <PaginationItem key={entry}>
              <PaginationLink
                href="#"
                isActive={entry === page}
                className={
                  entry === page
                    ? "size-10 rounded-lg border-border/70 bg-muted text-sm font-semibold"
                    : "size-10 rounded-lg text-sm font-semibold text-foreground"
                }
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(entry);
                }}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={`${entry}-${index}`}>
              <span className="flex size-10 items-center justify-center text-sm font-semibold text-muted-foreground">
                ...
              </span>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={page === totalPages}
            className={
              page === totalPages
                ? "pointer-events-none h-10 gap-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-40"
                : "h-10 gap-2 px-3 text-xs font-semibold uppercase tracking-[0.12em]"
            }
            onClick={(event) => {
              event.preventDefault();
              if (page === totalPages) return;
              onPageChange(Math.min(totalPages, page + 1));
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export const InventoryPaginationControls = React.memo(
  InventoryPaginationControlsInner,
);

