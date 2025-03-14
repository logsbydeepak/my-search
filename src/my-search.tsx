import { ActionPanel, Action, List, open, showToast, Toast, getDefaultApplication, Application } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { nanoid } from "nanoid";

import React from "react";
import { bangs } from "./bang";

export default function Command() {
  const [searchText, setSearchText] = React.useState("");
  const [filteredList, filterList] = React.useState<{ result: string; key: string }[]>([]);
  const [defaultApplication, setDefaultApplication] = React.useState<Application | null>(null);
  const { isLoading, data } = useFetch(
    `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
    },
  );

  React.useEffect(() => {
    async function handle() {
      try {
        const application = await getDefaultApplication("https://google.com");
        setDefaultApplication(application);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get default application",
        });
      }
    }
    handle();
  }, []);

  React.useEffect(() => {
    try {
      const parsedData = JSON.parse(data as string);
      if (!parsedData.length || !parsedData[1].length) {
        filterList([]);
        return;
      }
      const result = parsedData[1] as string[];
      result.push(parsedData[0]);
      result.forEach(() => {});

      filterList(() => {
        return result.map((i) => {
          return {
            result: i,
            key: nanoid(),
          };
        });
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse data",
      });
    }
  }, [data]);

  async function handleAction(searchText: string) {
    if (!defaultApplication) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get default application",
      });
      return;
    }

    const domain = handleDomain(searchText);
    if (domain) {
      await open(domain, defaultApplication.path);
      return;
    }

    const searchUrl = getBangredirectUrl(searchText);
    if (searchUrl) {
      await open(searchUrl, defaultApplication.path);
    } else {
      await open(`https://www.google.com/search?q=${searchText}`, defaultApplication.path);
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
          key={nanoid()}
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
          key={item.key}
          title={item.result}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => handleAction(item.result)} />
              <Action
                title="Fill Search"
                shortcut={{
                  modifiers: [],
                  key: "tab",
                }}
                onAction={() => setSearchText(item.result)}
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
