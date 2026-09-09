## Context

`frontend/src/components/MapView.tsx` renders `<YMap location={INITIAL_LOCATION} ref={handleMapRef}>`, where `INITIAL_LOCATION` is a module-level constant (`{ center: TBILISI_CENTER, zoom: DEFAULT_ZOOM }`). All camera movement after mount happens imperatively through `mapInstanceRef.current.setLocation(...)`, from four call sites: `handleClusterClick` (cluster tap), the `selectedCourt` centering effect, the mount-time geolocation lookup in `handleMapRef`, and `handleGeolocateFallback` (native locate-me control's error path). None of these read the camera position back into React state or props. `frontend/src/services/yandexMaps.ts` currently re-exports individual reactified components (`YMap`, `YMapMarker`, ...) but not the `reactify` module itself, even though it's already loaded to build those components. See `proposal.md` - Why for the root-cause investigation (undocumented-until-now `reactify.useDefault` requirement).

## Goals / Non-Goals

**Goals:**
- `location` seeds the camera once at mount and is never reapplied by React re-renders, so it stops fighting every imperative `setLocation()` call.
- All four existing imperative call sites keep working exactly as before, with no behavior change beyond "the position now sticks".

**Non-Goals:**
- Not converting camera position into React state (`useState` + two-arg `reactify.useDefault(location, [location])`), i.e. not making `location` a fully controlled prop. Nothing in this codebase needs to read the current camera position back into a render, so the larger refactor (touching all four call sites) would add risk without behavioral benefit.
- Not fixing the separately-discovered `YMapClusterer` per-render recompute churn (`renderMarker`/`renderCluster` in `MapView.tsx` aren't memoized, so the clusterer's React wrapper recomputes on every unrelated re-render). Confirmed unrelated to this bug during investigation; left as a latent performance concern for a future change.
- Not changing the bounds-fit-vs-fixed-step zoom strategy beyond re-verifying the existing `zoom + 3` step in `handleClusterClick` now that it can actually take effect.

## Decisions

**1. Use the one-arg `reactify.useDefault(INITIAL_LOCATION)` ("defaultValue" semantics), not the two-arg controlled form.**
Every position change in this codebase already goes through the imperative ref (`setLocation()`); nothing needs the `location` prop to reflect the current camera position back into a render. The one-arg form is documented to behave like `<input defaultValue>` — set once, ignored afterward — which is exactly "seed and never fight again". Alternative considered: migrate to `useState` + `reactify.useDefault(location, [location])` and replace every `setLocation()` call with the state setter. Rejected as unnecessary scope/risk for a bug fix — no call site needs React to be aware of the camera position.

**2. Export the whole `reactify` module from `yandexMaps.ts`'s `YandexMapsModules`, not just a hand-picked `useDefault` re-export.**
`reactify` is already loaded during SDK bootstrap (`ymaps3.import('@yandex/ymaps3-reactify')`) to build the reactified components. Exposing the module itself is the smallest change and keeps other `reactify` helpers available to `MapView.tsx` if needed later, instead of special-casing one function.

**3. Re-verify, don't re-derive, the existing `zoom + 3` step in `handleClusterClick`.**
That step-based approach already replaced an earlier bounds-fit approach that overshot (see the comment at its call site) but was never actually validated in the field, because the location-reset bug masked whether it worked. Once the reset is fixed, confirm empirically that +3 zoom levels reliably splits a 64px-grid cluster at the zoom levels courts are typically viewed at; adjust the constant only if it doesn't.

## Risks / Trade-offs

- [Risk] `reactify.useDefault`'s behavior isn't guaranteed stable across `@yandex/ymaps3-reactify` versions (it's a thin, sparsely-documented integration layer). → Mitigation: manually verify all four `setLocation()` call sites after the change (cluster click, native zoom control, locate-me control, court-selection centering), not just the one that was originally reported.
- [Risk] Once `location` is no longer React-reconciled, any future code that tries to move the camera by changing the constant/prop passed to `useDefault(...)` (rather than calling `setLocation()`) will silently do nothing. → Mitigation: a short inline comment at the `useDefault(...)` call site stating this constraint, so future contributors don't reintroduce a controlled-prop assumption.
- [Trade-off] This is a narrow, surgical fix scoped to `MapView.tsx`/`yandexMaps.ts`. It does not address the separately-discovered `YMapClusterer` recompute-per-render churn, which remains a latent cost outside this change.
