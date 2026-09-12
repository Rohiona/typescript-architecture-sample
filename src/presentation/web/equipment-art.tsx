import type { Equipment } from "../../domain/rentals/types.js";

export function EquipmentArt({ category, small = false }: { category: Equipment["category"]; small?: boolean }) {
  return (
    <div className={"equipment-art art-" + category + (small ? " art-small" : "")} aria-hidden="true">
      <svg viewBox="0 0 300 160" fill="none">
        <ellipse cx="152" cy="139" rx="79" ry="8" fill="currentColor" opacity=".09" />
        {category === "camera" && (
          <>
            <path
              d="M83 48h38l12-17h38l12 17h32a11 11 0 0 1 11 11v64a11 11 0 0 1-11 11H83a11 11 0 0 1-11-11V59a11 11 0 0 1 11-11Z"
              fill="#244e43"
            />
            <path d="M73 71h152v39H73z" fill="#1b3d35" />
            <rect x="82" y="55" width="28" height="9" rx="3" fill="#99afa0" />
            <rect x="189" y="55" width="22" height="8" rx="2" fill="#b5c4b4" />
            <circle cx="151" cy="88" r="44" fill="#133a32" stroke="#628475" strokeWidth="3" />
            <circle cx="151" cy="88" r="32" fill="#0c2826" stroke="#9ab2a0" strokeWidth="2" />
            <circle cx="151" cy="88" r="22" fill="#244f4a" />
            <path d="M138 70a22 22 0 0 1 30 28" stroke="#739f91" strokeWidth="5" strokeLinecap="round" opacity=".8" />
            <circle cx="144" cy="81" r="8" fill="#bed4bc" opacity=".38" />
            <path d="M79 41h25v7H79z" fill="#173b32" />
          </>
        )}
        {category === "projector" && (
          <>
            <path d="m91 56 128 4 10 57-143 2Z" fill="#97a293" />
            <path d="M81 51a9 9 0 0 1 9-9h118a13 13 0 0 1 12 10l9 57H84Z" fill="#e0e0cf" />
            <rect x="80" y="71" width="150" height="52" rx="11" fill="#bbc2ad" />
            <path d="M94 84h39m-39 7h39m-39 7h39m-39 7h39" stroke="#7b8e7b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="191" cy="95" r="27" fill="#496655" />
            <circle cx="191" cy="95" r="19" fill="#143e39" stroke="#96b3a0" strokeWidth="2" />
            <circle cx="187" cy="90" r="9" fill="#81aba0" opacity=".5" />
            <rect x="135" y="48" width="35" height="6" rx="3" fill="#9bab95" />
            <path d="M92 123v7m123-7v7" stroke="#526e58" strokeWidth="7" strokeLinecap="round" />
          </>
        )}
        {category === "tripod" && (
          <>
            <path d="m152 64-57 67m57-67 55 67m-55-67v68" stroke="#516d5b" strokeWidth="7" strokeLinecap="round" />
            <path d="m123 99-25 31m79-31 26 31m-51-31v33" stroke="#1d4137" strokeWidth="8" strokeLinecap="round" />
            <path d="M152 39v32" stroke="#afbaa4" strokeWidth="9" />
            <rect x="137" y="29" width="30" height="20" rx="5" fill="#1e493c" />
            <path d="m159 35 32-13" stroke="#516d5b" strokeWidth="5" strokeLinecap="round" />
            <path d="M134 26h36" stroke="#1e493c" strokeWidth="6" strokeLinecap="round" />
            <circle cx="152" cy="68" r="9" fill="#183d31" />
            <path d="M91 135h12m43 1h12m42-1h12" stroke="#163a30" strokeWidth="6" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}
