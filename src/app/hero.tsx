"use client";

import Link from 'next/link';
import Image from 'next/image';
import styles from './hero.module.css';
import { LanguageSwitcher, useLanguage } from './language-provider';

interface HeroProps {
  registeredVisitorId: string | null;
}

export default function Hero({ registeredVisitorId }: HeroProps) {
  const { t } = useLanguage();

  return (
    <div className={`position-relative d-flex align-items-center ${styles.heroContainer}`}>
      <Image
        src="/aa.jpg"
        alt="Kapal kontainer MCS Internasional"
        fill
        sizes="100vw"
        preload
        className={`position-absolute top-0 start-0 ${styles.heroImage}`}
      />
      <div className={`position-absolute top-0 start-0 w-100 h-100 ${styles.overlay}`} />

  <div className={`position-absolute top-0 end-0 m-4 ${styles.languageControl}`}>
    <LanguageSwitcher />
  </div>

      <div className={`position-relative container ${styles.heroContent}`}>
        <div className="col-12 col-md-7 col-lg-6">
          <Link
            href="/login"
            className={styles.logoBadge}
            aria-label="Login as user or admin"
          >
            <Image
              src="/a.png"
              alt="PT MCS Internasional"
              fill
              className={styles.logoImage}
            />
          </Link>
          <h1 className={styles.heroTitle}>
            {t('heroTitle')}<br />MCS Internasional
          </h1>
          <p className={styles.heroDescription}>
            {t('heroDescription')}
          </p>
          {registeredVisitorId && (
            <div className={styles.registrationSuccess} role="status">
              {t("registrationComplete")} #{registeredVisitorId}
            </div>
          )}
          <div className="d-flex flex-wrap gap-3">
            <Link href="/register" className={`btn ${styles.heroButton}`}>
              {t('registerNow')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}