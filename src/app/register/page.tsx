"use client";
import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import DivisionPicFields from "@/components/DivisionPicFields";
import { LanguageSwitcher, useLanguage } from "../language-provider";
import styles from "../page.module.css";
import type { Visitor } from "@/types/visitor";

type RegistrationVisitor = Omit<
  Visitor,
  "id" | "checkIn" | "checkOut" | "status"
> & {
  vessel: string;
  division: string;
  pic: string;
};

// Submit / post
export default function RegisterPage() {
  const { t } = useLanguage();
  const [visitor, setVisitor] = useState<RegistrationVisitor>({
    name: "",
    company: "",
    vessel: "",
    purpose: "",
    phone: "",
    division: "",
    pic: "",
  });
  const [visitorType, setVisitorType] = useState<"company" | "sailor">("company");
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [visitorId,setVisitorId]=useState<number |null>(null);

  function updateVisitor(field: keyof RegistrationVisitor, value: string) {
    setVisitor((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
    setShowError(false);
  }

 async function handleSubmit(event: React.FormEvent<HTMLFormElement>,) {
    event.preventDefault();
    const requiredValues = [
      visitor.name,
      visitorType === "company" ? visitor.company : visitor.vessel,
      visitor.phone,
      visitor.purpose,
      visitor.division,
      visitor.pic,
    ];
    const isComplete = requiredValues.every((value) => value.trim() !== "");
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
        body:JSON.stringify(visitor),
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

      setVisitor({
        name: "",
        company: "",
        vessel: "",
        purpose: "",
        phone: "",
        division: "",
        pic: "",
      });
      setVisitorType("company");

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
                        visitorType === "company"
                          ? styles.visitorTypeOptionSelected
                          : ""
                      }`}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        id="visitor-type-company"
                        name="visitorType"
                        value="company"
                        checked={visitorType === "company"}
                        onChange={() => {
                          setVisitorType("company");
                          updateVisitor("vessel", "");
                        }}
                      />
                      <span>{t("companyVisitor")}</span>
                    </label>
                    <label
                      className={`${styles.visitorTypeOption} ${
                        visitorType === "sailor"
                          ? styles.visitorTypeOptionSelected
                          : ""
                      }`}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        id="visitor-type-sailor"
                        name="visitorType"
                        value="sailor"
                        checked={visitorType === "sailor"}
                        onChange={() => {
                          setVisitorType("sailor");
                          updateVisitor("company", "");
                        }}
                      />
                      <span>{t("sailorVisitor")}</span>
                    </label>
                  </div>
                </fieldset>
              </div>
              <div className="col-12">
                <label
                  htmlFor={visitorType === "company" ? "company" : "vessel"}
                  className="form-label"
                >
                  {visitorType === "company" ? t("company") : t("vessel")}
                </label>
                <input
                  type="text"
                  id={visitorType === "company" ? "company" : "vessel"}
                  className="form-control"
                  value={visitorType === "company" ? visitor.company : visitor.vessel}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateVisitor(
                      visitorType === "company" ? "company" : "vessel",
                      event.target.value,
                    )
                  }
                  placeholder={
                    visitorType === "company"
                      ? t("companyPlaceholder")
                      : t("vesselPlaceholder")
                  }
                  required
                />
              </div>
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
