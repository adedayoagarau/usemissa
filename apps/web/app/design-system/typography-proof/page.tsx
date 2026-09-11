import localFont from "next/font/local";
import { TypographyProof } from "./typography-proof";

const newsreader = localFont({
  src: "../../../fonts/newsreader-variable.woff2",
  variable: "--proof-editorial",
  weight: "200 800",
  display: "swap",
});

const instrument = localFont({
  src: "../../../fonts/instrument-sans.woff2",
  variable: "--proof-interface",
  weight: "400 700",
  display: "swap",
});

export default function TypographyProofPage() {
  return (
    <div className={`${newsreader.variable} ${instrument.variable}`}>
      <TypographyProof />
    </div>
  );
}
