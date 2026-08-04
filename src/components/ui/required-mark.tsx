/* src/components/ui/required-mark.tsx
 * Red asterisk for required form fields (Design §6.2: error/required marker in
 * --stamp-red). Screen-reader friendly (aria-hidden, the label text conveys
 * requirement).
 */
export function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-destructive">
      *
    </span>
  );
}
