"use client";

import AddRecipe from "@/components/shared/AddRecipe";
import List from "@/components/shared/List";
import { DataTableColumnHeader } from "@/components/ui/data-table-header";
import { IRecipe } from "@/lib/models/recipe";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import React from "react";

export default function RecipeList(props: { recipes: IRecipe[] }) {
  const [loading, setLoading] = React.useState(false);

  const newCoffee = {
    id: "",
    name: "",
    avgExperience: 0,
    avgTaste: 0,
    avgRating: 0,
    userGroupId: "",
    addedById: "",
    archive: false,
    address: "",
  };

  const columns: ColumnDef<IRecipe>[] = [
    {
      accessorKey: "recipeName",
      title: "Name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "recipeSource",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => {
        const recipe = row.original;

        if (recipe.recipeLink) {
          return (
            <Link
              href={recipe.recipeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {recipe.recipeLink}
            </Link>
          );
        } else {
          return `${recipe.recipeBook}, ${recipe.recipePageNo}`;
        }
      },
    },
  ];

  return (
    <List
      records={props.recipes}
      rowFormatter={null}
      columns={columns}
      filterColumns={["recipeName"]}
      addRecordComp={<AddRecipe />}
    />
  );
}
