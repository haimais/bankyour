import { expect, test } from "@playwright/test";

test.describe("Button Map Smoke", () => {
  test("home page main actions", async ({ page }) => {
    await page.goto("/");

    const heroSection = page.locator("main section").first();
    const exploreLink = heroSection.getByRole("link", {
      name: /Explore Services|Смотреть сервисы/i
    });
    const exploreButton = heroSection.getByRole("button", {
      name: /Explore Services|Смотреть сервисы/i
    });
    const explore = (await exploreLink.count()) > 0 ? exploreLink.first() : exploreButton.first();

    await expect(explore).toBeVisible();
    await explore.click();
    await expect(page).toHaveURL(/\/services/);

    await page.goto("/");
    const chatOpen = page.getByRole("button", {
      name: /Talk to AI Assistant|Поговорить с AI/i
    });
    if (await chatOpen.isVisible()) {
      await chatOpen.click();
      await expect(page.getByText(/Bank-your AI Assistant|AI-помощник Bank-your/i)).toBeVisible();

      const closeChat = page.getByRole("button", {
        name: /Close assistant|Закрыть AI-помощника/i
      });
      if (await closeChat.isVisible()) {
        await closeChat.click();
      }
    }

    const serviceChoiceActions = heroSection
      .locator("h2 + div")
      .first()
      .locator(":is(button,a)");
    if ((await serviceChoiceActions.count()) > 0) {
      await serviceChoiceActions.first().click();
      await expect(page).toHaveURL(/\/services\?category=/);
    }
  });

  test("services page actions and card buttons", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveURL(/\/services/);

    const clearFilters = page.getByRole("button", {
      name: /Clear filters|Сбросить фильтры/i
    });
    await expect(clearFilters).toBeVisible();
    await clearFilters.click();

    const categoryButtons = page.locator("button").filter({
      hasText: /Cards|Карт|Loans|Кредит|Deposits|Вклад|Investments|Инвест|Business|Документ/
    });
    if ((await categoryButtons.count()) > 0) {
      await categoryButtons.first().click();
    }

    const details = page.getByRole("button", { name: /More details|Подробнее/i }).first();
    if (await details.isVisible()) {
      await details.click();
    }
  });

  test("news to pulse and source link availability", async ({ page }) => {
    await page.goto("/news");
    await expect(page).toHaveURL(/\/news/);

    const detailLink = page.getByRole("link", { name: /More details|Подробнее/i }).first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
      await expect(page).toHaveURL(/\/pulse\//);
    }
  });

  test("search page buttons and links", async ({ page }) => {
    await page.goto("/search?q=bank");
    await expect(page).toHaveURL(/\/search\?q=/);

    const serviceResult = page.locator('a[href^="/services?category="]').first();
    if (await serviceResult.isVisible()) {
      await serviceResult.click();
      await expect(page).toHaveURL(/\/services\?category=/);
    }
  });

  test("business and calculators pages actions", async ({ page }) => {
    await page.goto("/business");
    await expect(page).toHaveURL(/\/business/);

    const businessCalcLink = page.locator('a[href="/calculators/business"]').first();
    await expect(businessCalcLink).toBeVisible();
    await businessCalcLink.click();
    await expect(page).toHaveURL(/\/calculators\/business/);

    const submit = page.getByRole("button", { name: /Check rate|Узнать ставку/i });
    await expect(submit).toBeVisible();
    await submit.click();

    await expect(page.getByText(/Service summary|Краткая сводка услуг/i).first()).toBeVisible();
  });

  test("header and footer nav links are routable", async ({ page }) => {
    await page.goto("/");

    const links = [
      "/services",
      "/news",
      "/calculators",
      "/business",
      "/about",
      "/contact"
    ];

    for (const href of links) {
      await page.goto(href);
      await expect(page).toHaveURL(new RegExp(href));
      const response = await page.request.get(href);
      expect(response.ok()).toBeTruthy();
    }
  });
});
