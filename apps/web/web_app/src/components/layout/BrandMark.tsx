import Image from 'next/image';
import styles from './BrandMark.module.css';

/** Keep the original train artwork, framed and sized for small navigation marks. */
export function BrandMark({ size = 'regular' }: { size?: 'small' | 'regular' | 'large' }) {
  return <span className={`${styles.mark} ${size === 'regular' ? '' : styles[size]}`} aria-hidden="true">
    <Image src="/brand/logo.png" alt="" width={96} height={92} className={styles.artwork} />
  </span>;
}
