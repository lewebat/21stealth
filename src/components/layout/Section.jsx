import Container from './Container'

/**
 * Section — wraps .section CSS class with optional Container.
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} contained
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'fluid'} containerSize
 */
export default function Section({ children, size = 'md', contained = true, containerSize = 'xl', className = '', ...props }) {
  const sizeClass = size !== 'md' ? `section-${size}` : 'section'
  return (
    <section className={[sizeClass, className].filter(Boolean).join(' ')} {...props}>
      {contained ? (
        <Container size={containerSize}>{children}</Container>
      ) : (
        children
      )}
    </section>
  )
}
