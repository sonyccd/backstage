/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { lazy, Suspense } from 'react';

import { ListItemProps } from '@material-ui/core';

import {
  ExtensionBoundary,
  createExtension,
  createExtensionDataRef,
} from '@backstage/frontend-plugin-api';
import { Progress } from '@backstage/core-components';

import { SearchDocument, SearchResult } from '@backstage/plugin-search-common';

import { SearchResultListItemExtension } from './extensions';

/** @alpha */
type SearchResultItemExtensionComponent<P> = (props: P) => JSX.Element | null;

/** @alpha */
type SearchResultItemExtensionPredicate =
  | ((result: SearchResult) => boolean)
  | undefined;

/** @alpha */
export const getSearchResultItemExtensionData = <
  P extends BaseSearchResultListItemProps = {},
>() =>
  createExtensionDataRef<{
    predicate: SearchResultItemExtensionPredicate;
    component: (props: P) => JSX.Element;
  }>('plugin.search.result.item.data');

/** @alpha */
export type SearchResultItemExtensionOptions<P> = {
  /**
   * The extension id.
   */
  id: string;
  /**
   * The extension attachment point (e.g., search modal or page).
   */
  at: string;
  /**
   * The extension component.
   */
  component: () => Promise<SearchResultItemExtensionComponent<P>>;
  /**
   * When an extension defines a predicate, it returns true if the result should be rendered by that extension.
   * Defaults to a predicate that returns true, which means it renders all sorts of results.
   */
  predicate?: SearchResultItemExtensionPredicate;
};

/** @alpha */
export type BaseSearchResultListItemProps = {
  rank?: number;
  result?: SearchDocument;
  noTrack?: boolean;
} & Omit<ListItemProps, 'button'>;

/** @alpha */
export const createSearchResultListItemExtension = <
  P extends BaseSearchResultListItemProps = {},
>(
  options: SearchResultItemExtensionOptions<P>,
) =>
  createExtension({
    id: `plugin.search.result.item.${options.id}`,
    at: options.at,
    output: {
      item: getSearchResultItemExtensionData<P>(),
    },
    factory({ bind, source }) {
      const LazyComponent = lazy(() =>
        options.component().then(component => ({ default: component })),
      ) as unknown as SearchResultItemExtensionComponent<P>;

      bind({
        item: {
          predicate: options.predicate,
          component: (props: P) => (
            <ExtensionBoundary source={source}>
              <Suspense fallback={<Progress />}>
                <SearchResultListItemExtension
                  rank={props.rank}
                  result={props.result}
                  noTrack={props.noTrack}
                >
                  <LazyComponent {...props} />
                </SearchResultListItemExtension>
              </Suspense>
            </ExtensionBoundary>
          ),
        },
      });
    },
  });
