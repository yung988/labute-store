"use client";

import Link from "next/link";
import { useState } from "react";

interface NewsletterSignupProps {
  compact?: boolean;
}

export default function NewsletterSignup({ compact = false }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implementace odeslání na newsletter API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSubmitted(true);
      setEmail("");
      setPhone("");
    } catch (error) {
      console.error("Newsletter signup error:", error);
      alert("Došlo k chybě. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className={`w-full mx-auto text-center ${compact ? "max-w-md" : "max-w-3xl border border-gray-300 p-8"}`}
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-labelledby="success-icon-title"
          >
            <title id="success-icon-title">Success checkmark</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-medium mb-2">Děkujeme!</h3>
        <p className="text-zinc-600">
          Vaše emailová adresa byla úspěšně přidána do našeho newsletteru.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`w-full mx-auto ${compact ? "max-w-md" : "max-w-3xl border border-gray-300 p-8"}`}
    >
      {!compact && (
        <p className="text-center text-xs mb-8 font-medium">
          PŘIHLASTE SE K ODBĚRU NOVINEK Z OBCHODU YEEZUZ2020
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full border border-gray-300 p-3 text-xs focus:border-black focus:outline-none"
        />

        {!compact && (
          <div className="flex items-center border border-gray-300">
            <div className="flex items-center px-3 border-r border-gray-300">
              <span className="text-xs mr-2">🇨🇿</span>
              <span className="text-xs">+420</span>
            </div>
            <input
              type="tel"
              placeholder="Telefonní číslo"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 p-3 text-xs border-0 outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white p-3 text-xs font-medium tracking-wide hover:bg-gray-900 transition-colors disabled:bg-zinc-300 disabled:text-zinc-500"
        >
          {isSubmitting ? "PŘIHLAŠUJI..." : "PŘIHLÁSIT SE"}
        </button>
      </form>

      <p className="text-[9px] mt-4 leading-tight">
        Odesláním tohoto formuláře a přihlášením se k odběru SMS souhlasíte s přijímáním
        marketingových textových zpráv (např. promo akce, připomenutí košíku) od společnosti
        YEEZUZ2020. Souhlas není podmínkou nákupu. Mohou být účtovány poplatky za data. Četnost
        zpráv se liší. Odběr můžete kdykoli zrušit zasláním STOP nebo kliknutím na odkaz pro
        odhlášení (pokud je k dispozici).{" "}
        <Link href="/privacy" className="underline">
          Zásady ochrany osobních údajů
        </Link>{" "}
        &{" "}
        <Link href="/podminky" className="underline">
          Podmínky
        </Link>
        .
      </p>
    </div>
  );
}
