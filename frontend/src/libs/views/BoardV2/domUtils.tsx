export function middleOfElement(element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
}

export function findCardAt(
    x: number,
    y: number,
    excludedCardNode: HTMLElement
): HTMLElement {
    return Array.from(document.elementsFromPoint(x, y)).find(
        (e) =>
            e instanceof HTMLElement &&
            !excludedCardNode.contains(e) &&
            e.dataset.cardId
    ) as HTMLElement;
}
