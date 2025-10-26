"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { IconFilePlus, IconSearch } from "@tabler/icons-react";
import FullScreenModal from "./FullScreenModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { IRecipe } from "@/lib/models/recipe";

export default function List(props: {
  records: IRecipe[];
  columns: ColumnDef<any>[];
  filterColumns: string[];
  addRecordComp: React.ReactElement;
  rowFormatter: any;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [filteredRecords, setFilteredRecords] = useState(props.records);
  const [open, setOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const handleSearchClickOpen = () => {
    setSearchOpen(true);
    focusRef.current?.focus();
  };

  const router = useRouter();

  useEffect(() => {
    if (searchValue !== "") {
      const lowercaseSearchValue = searchValue.toLowerCase();
      const filtered = props.records.filter((record: IRecipe) =>
        props.filterColumns.some((element) => {
          const value = (record as any)[element];

          if (value !== null && !(Array.isArray(value) && value.length === 0)) {
            if (typeof value === "string") {
              return value.toLowerCase().includes(lowercaseSearchValue);
            } else if (Array.isArray(value)) {
              return value.some((item: string) =>
                item.toLowerCase().includes(lowercaseSearchValue),
              );
            }
          }

          return false;
        }),
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(props.records);
    }
  }, [searchValue, props.records, props.filterColumns]);

  const focusRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="mb-4 flex">
        <FullScreenModal
          button={
            <Button id="add-button">
              <IconFilePlus width={24} height={24} strokeLinejoin="miter" />
            </Button>
          }
          form={props.addRecordComp}
          title="Add recipe"
          open={false}
          func={function (open: boolean): void {
            throw new Error("Function not implemented.");
          }}
        />
        <div
          className={`relative ${
            searchOpen ? "w-4/5" : "w-0 overflow-hidden"
          } ml-auto transition-all duration-300 ease-in-out`}
        >
          <Input
            ref={focusRef}
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={`${searchOpen ? "w-full" : "w-0"} pl-2`}
          />
        </div>
        <Button
          id="search-button"
          className={`${searchOpen ? "hidden" : "ml-auto"}`}
          onClick={handleSearchClickOpen}
        >
          <IconSearch width={24} height={24} strokeLinejoin="miter" />
        </Button>
      </div>
      <DataTable columns={props.columns} data={filteredRecords} />
    </div>
  );
}
