"use client";

import React from "react";
import { SignOutButton, SignedIn } from "@clerk/nextjs";
import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();
  return (
    <SignedIn>
      <SignOutButton signOutOptions={{ redirectUrl: "sign-in" }}>
        <div className="flex cursor-pointer items-center">
          <IconLogout
            size={24}
            className="text-light-1"
            stroke={1}
            strokeLinejoin="miter"
          />
          <p className="text-light-2 ml-2 max-lg:hidden">Logout</p>
        </div>
      </SignOutButton>
    </SignedIn>
  );
}
