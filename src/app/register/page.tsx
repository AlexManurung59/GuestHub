"use client";
import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DivisionPicFields from "@/components/DivisionPicFields";
import { scrollRank } from "@/data/scroll";
import { LanguageSwitcher, useLanguage } from "../language-provider";
import styles from "../page.module.css";
import type { Visitor } from "@/types/visitor";

type RegistrationVisitorType = "SEAFARER" | "GUEST";

type RegistrationVisitor = Omit<
  Visitor,
  | "id"
  | "checkIn"
  | "checkOut"
  | "status"
  | "visitorType"
  | "rank"
  | "position"
> & {
  division: string;
  pic: string;
  rank: string;
  position: string;
};

// Submit / post
export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [visitor, setVisitor] = useState<RegistrationVisitor>({
    name: "",
    company: "",
    purpose: "",
    phone: "",
    division: "",
    pic: "",
    rank: "",
    position: "",
  });
  const [visitorType, setVisitorType] = useState<RegistrationVisitorType | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [visitorId,setVisitorId]=useState<number |null>(null);

  function updateVisitor(field: keyof RegistrationVisitor, value: string) {
    setVisitor((current) => ({
      ...current,
      [field]: field === "purpose" ? value : value.toUpperCase(),
    }));
    setSubmitted(false);
    setShowError(false);
  }

 async function handleSubmit(event: React.FormEvent<HTMLFormElement>,) {
    event.preventDefault();
    const requiredValues = [
      visitor.name,
      ...(visitorType === "GUEST" ? [visitor.company] : []),
      visitor.phone,
      visitor.purpose,
      visitor.division,
      visitor.pic,
    ];
    const hasRequiredRoleDetails =
      visitorType === "GUEST"
        ? Boolean(visitor.position.trim())
        : visitorType === "SEAFARER" &&
          Boolean(visitor.rank) &&
          (visitor.rank !== "OTHERS" || Boolean(visitor.position.trim()));
    const isComplete =
      requiredValues.every((value) => value.trim() !== "") &&
      hasRequiredRoleDetails;
    if(!isComplete){
      setShowError(true);
      setSubmitted(false);
      return;
    }

    try{
      const response = await fetch("/api/visitors",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
        },
        body: JSON.stringify({
          name: visitor.name,
          company: visitorType === "GUEST" ? visitor.company : null,
          phone: visitor.phone,
          purpose: visitor.purpose.toUpperCase(),
          division: visitor.division,
          pic: visitor.pic,
          visitorType,
          rank: visitorType === "SEAFARER" ? visitor.rank : null,
          position:
            visitorType === "GUEST" || visitor.rank === "OTHERS"
              ? visitor.position
              : null,
        }),
      });
      const data = await response.json();
      if(!response.ok){
        console.error("API Error",data);
        setShowError(true);
        setSubmitted(false);
        return;
      }
console.log("Visitor Successfully created:",data);

      setVisitorId(data.id);
      setShowError(false);
      setSubmitted(true);
      router.push(`/?registered=1&visitorId=${encodeURIComponent(data.id)}`);

      setVisitor({
        name: "",
        company: "",
        purpose: "",
        phone: "",
        division: "",
        pic: "",
        rank: "",
        position: "",
      });
      setVisitorType("");

    }catch(error){ 
      console.error("POST Error:",error);
      setShowError(true);
    setSubmitted(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className="position-absolute top-0 end-0 m-3">
        <LanguageSwitcher />
      </div>
      <div className={styles.shell}>
        <section className={styles.intro}>
          <Image src="/a.png" alt="MCS Internasional" width={72} height={72} />
          <span className={styles.eyebrow}>MCSI VISITOR DESK</span>
          <h1>{t("visitorRegistration")}</h1>
          <p>{t("welcome")}</p>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formHeading}>
            <div>
              <span className={styles.sectionTag}>VISITOR FORM</span>
              <h2>{t("visitorRegistration")}</h2>
              <p>{t("formIntro")}</p>
            </div>
            <Link href="/" className={styles.backLink}>
              {t("backHome")}
            </Link>
          </div>
          {submitted && (
            <div className="alert alert-success" role="status">
              <strong>{t("successTitle")}</strong>
              <br />
              {t("successMessage")}
              <br/>
              <strong>Visitor Number: #{visitorId}</strong>
            </div>
          )}
          {showError && (
            <div className="alert alert-danger" role="alert">
              {t("required")}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-12">
                <label htmlFor="name" className="form-label">
                  {t("fullName")}
                </label>
                <input
                type="text"
                  id="name"
                  className="form-control"
                  value={visitor.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateVisitor("name", e.target.value)
                  }
                  placeholder={t("fullNamePlaceholder")}
                  required
                />
              </div>
              <div className="col-12">
                <fieldset>
                  <legend className="form-label">{t("visitorType")}</legend>
                  <div className={styles.visitorTypeOptions}>
                    <label
                      className={`${styles.visitorTypeOption} ${
                        visitorType === "SEAFARER"
                          ? styles.visitorTypeOptionSelected
                          : ""
                      }`}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        id="visitor-type-seafarer"
                        name="visitorType"
                        value="SEAFARER"
                        checked={visitorType === "SEAFARER"}
                        onChange={() => {
                          setVisitorType("SEAFARER");
                          updateVisitor("company", "");
                          updateVisitor("position", "");
                        }}
                      />
                      <span>{t("seafarerVisitor")}</span>
                    </label>
                    <label
                      className={`${styles.visitorTypeOption} ${
                        visitorType === "GUEST"
                          ? styles.visitorTypeOptionSelected
                          : ""
                      }`}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        id="visitor-type-guest"
                        name="visitorType"
                        value="GUEST"
                        checked={visitorType === "GUEST"}
                        onChange={() => {
                          setVisitorType("GUEST");
                          updateVisitor("rank", "");
                          updateVisitor("position", "");
                        }}
                      />
                      <span>{t("guestVisitor")}</span>
                    </label>
                  </div>
                </fieldset>
              </div>
              {visitorType === "GUEST" && (
                <div className="col-12">
                  <label htmlFor="company" className="form-label">
                    {t("company")}
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="form-control"
                    value={visitor.company}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateVisitor("company", event.target.value)
                    }
                    placeholder={t("companyPlaceholder")}
                    required
                  />
                </div>
              )}
              {visitorType === "SEAFARER" && (
                <div className="col-12">
                  <label htmlFor="rank" className="form-label">
                    {t("rank")}
                  </label>
                  <select
                    id="rank"
                    className="form-select"
                    value={visitor.rank}
                    onChange={(event) => {
                      updateVisitor("rank", event.target.value);
                      if (event.target.value !== "OTHERS") {
                        updateVisitor("position", "");
                      }
                    }}
                    required
                  >
                    <option value="">{t("selectRank")}</option>
                    {scrollRank.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(visitorType === "GUEST" ||
                (visitorType === "SEAFARER" && visitor.rank === "OTHERS")) && (
                <div className="col-12">
                  <label htmlFor="position" className="form-label">
                    {t("position")}
                  </label>
                  {visitorType === "SEAFARER" && visitor.rank === "OTHERS" && (
                    <p className="form-text">
                      Masukkan jabatan pelaut jika rank tidak tersedia di daftar.
                    </p>
                  )}
                  <input
                    id="position"
                    type="text"
                    className="form-control"
                    value={visitor.position}
                    onChange={(event) =>
                      updateVisitor("position", event.target.value)
                    }
                    placeholder={t("positionPlaceholder")}
                    required
                  />
                </div>
              )}
              <div className="col-md-6">
                <label htmlFor="purpose" className="form-label">
                  {t("purpose")}
                </label>
                <input
                  id="purpose"
                  className="form-control"
                  value={visitor.purpose}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateVisitor("purpose", e.target.value)
                  }
                  style={{ textTransform: "uppercase" }}
                  placeholder={t("purposePlaceholder")}
                  required
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="phone" className="form-label">
                  {t("phone")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-control"
                  value={visitor.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateVisitor("phone", e.target.value)
                  }
                  placeholder={t("phonePlaceholder")}
                  required
                />
              </div>
              <div className="col-12">
                <DivisionPicFields
                  division={visitor.division}
                  pic={visitor.pic}
                  onDivisionChange={(value) => updateVisitor("division", value)}
                  onPicChange={(value) => updateVisitor("pic", value)}
                  divisionLabel={t("division")}
                  selectDivisionLabel={t("selectDivision")}
                  picLabel={t("pic")}
                  selectPICLabel={t("selectPIC")}
                />
              </div>
            </div>
            <button
              type="submit"
              className={`btn btn-primary w-100 ${styles.submitButton}`}
            >
              {t("register")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
