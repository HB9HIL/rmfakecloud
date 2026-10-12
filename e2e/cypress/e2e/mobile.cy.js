// the same app on a phone, below the md breakpoint
describe("mobile", () => {
  beforeEach(() => {
    cy.viewport("iphone-x");
    cy.login();
  });

  it("collapses the navigation", () => {
    cy.visit("/help");
    cy.contains("header nav a", "Documents").should("not.be.visible");
    cy.get("button[aria-label=Menu]").click();
    cy.contains("header nav a", "Documents").click();

    cy.location("pathname").should("eq", "/documents");
    cy.contains("header nav a", "Documents").should("not.be.visible");
  });

  it("opens the document tree from the side", () => {
    cy.visit("/documents");
    cy.get("#folders").should("not.be.visible");
    cy.contains("button", "Folders").click();
    cy.get("#folders").should("be.visible");
    cy.get("#folders").contains("[role=treeitem]", "My Files").click();
    cy.get("#folders").should("not.be.visible");

    cy.get("input[type=file]").selectFile("cypress/fixtures/test.pdf", { force: true });
    // cypress has no touch pointer, so it opens like a desktop
    cy.contains(".filelist-item", "test").dblclick();
    cy.get(".react-pdf__Page canvas").should("be.visible");

    cy.visit("/documents");
    cy.contains(".filelist-item", "test").find(".filelist-checkbox").check();
    cy.contains("button", "Delete").click();
    cy.contains('Moved "test" to Trash');
  });

  it("turns pages with a swipe", () => {
    cy.visit("/documents");
    cy.get("input[type=file]").selectFile("cypress/fixtures/text.pdf", { force: true });
    cy.contains(".filelist-item", "text").dblclick();
    cy.get(".react-pdf__Page canvas").should("be.visible");

    const swipe = (from, to) =>
      cy
        .get(".react-pdf__Page")
        .parent()
        .trigger("touchstart", { touches: [{ clientX: from, clientY: 400 }] })
        .trigger("touchend", { changedTouches: [{ clientX: to, clientY: 410 }] });
    swipe(300, 100);
    cy.get("input[aria-label=Page]").should("have.value", "2");
    swipe(100, 300);
    cy.get("input[aria-label=Page]").should("have.value", "1");
  });

  it("has no horizontal overflow", () => {
    const pages = [
      ["/help", "h1"],
      ["/integrations", "table"],
      ["/admin", "table"],
      ["/connect", "h1"],
      ["/profile", "form"],
    ];
    for (const [path, ready] of pages) {
      cy.visit(path);
      cy.get(ready).should("be.visible");
      cy.get(".app-main").should(($el) => {
        expect($el[0].scrollWidth, path).to.be.at.most($el[0].clientWidth);
      });
      cy.document().should((doc) => {
        expect(doc.documentElement.scrollWidth, path).to.be.at.most(doc.documentElement.clientWidth);
      });
    }
  });
});
