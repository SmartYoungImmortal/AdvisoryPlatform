import Script from "next/script";

export function LoadOmise() {
  return (
    <Script
      type="text/javascript"
      src="https://cdn.omise.co/omise.js"
      onLoad={() => {
        window.Omise.setPublicKey(process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || "");
      }}
    ></Script>
  );
}
