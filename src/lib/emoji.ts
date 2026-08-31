const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' })

/** True si el string es exactamente un emoji (acepta secuencias compuestas: familias, banderas, tono de piel). */
export function isSingleEmoji(input: string): boolean {
  const graphemes = [...segmenter.segment(input)]
  if (graphemes.length !== 1) return false
  // Extended_Pictographic cubre la mayoría (🔥👍❤️👨‍👩‍👧‍👦); las banderas (🇦🇷) son un
  // par de Regional_Indicator, que no cae bajo esa propiedad.
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(graphemes[0].segment)
}
