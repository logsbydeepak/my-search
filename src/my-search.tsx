import { ActionPanel, Action, List, open, showToast, Toast, getDefaultApplication } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import React from "react";
import { bangs } from "./bang";

const items: string[] = [];

export default function Command() {
  const [searchText, setSearchText] = React.useState("");
  const [filteredList, filterList] = React.useState(items);

  const { isLoading, data } = useFetch(
    `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
    },
  );

  React.useEffect(() => {
    try {
      const parsedData = JSON.parse(data as string);
      if (!parsedData.length || !parsedData[1].length) {
        filterList([]);
        return;
      }
      const result = parsedData[1];
      result.push(parsedData[0]);
      filterList(result);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse data",
      });
    }
  }, [data]);

  React.useEffect(() => {}, []);

  async function handleAction(searchText: string) {
    const application = await getDefaultApplication("https://google.com");

    const domain = handleDomain(searchText);
    if (domain) {
      await open(domain, application.path);
      return;
    }

    const searchUrl = getBangredirectUrl(searchText);
    if (searchUrl) {
      await open(searchUrl, application.path);
    } else {
      await open(`https://www.google.com/search?q=${searchText}`, application.path);
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search"
      searchBarPlaceholder="Search the web..."
    >
      {searchText.length !== 0 && (
        <List.Item
          key={"default"}
          title={searchText}
          subtitle="default search"
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => handleAction(searchText)} />
            </ActionPanel>
          }
        />
      )}

      {filteredList.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => handleAction(item)} />
              <Action
                title="Fill Search"
                shortcut={{
                  modifiers: [],
                  key: "tab",
                }}
                onAction={() => setSearchText(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getBangredirectUrl(rawQuery: string) {
  const query = rawQuery;
  const match = query.match(/!(\S+)/i);

  const bangCandidate = match?.[1]?.toLowerCase();
  const selectedBang = bangs.find((b) => b.t === bangCandidate);

  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

  const searchUrl = selectedBang?.u.replace("{{{s}}}", encodeURIComponent(cleanQuery).replace(/%2F/g, "/"));
  if (!searchUrl) return null;

  return searchUrl;
}

function handleDomain(domain: string): string | undefined {
  {
    const text = domain.includes(" ");
    if (text) {
      return;
    }
  }
  {
    const text = domain.startsWith("://");
    if (text) {
      return `http${domain}`;
    }
  }
  {
    const text = domain.includes("/");
    if (text) {
      return domain;
    }
  }
  {
    const text = domain.split(".");
    if (text.length !== 1) {
      return `http://${domain}`;
    }
  }
}
