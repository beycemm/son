"""Core CLI application module for the son project."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

DEFAULT_DB_PATH = Path("tasks.json")
DEFAULT_MARKET_DB_PATH = Path("marketplace.json")
COMMISSION_RATE = 0.10


def project_status() -> str:
    """Return a short human-readable status message for the project."""
    return "Proje hazır: görev CLI ve alan pazaryeri (%%10 komisyon) çalışıyor."


# ---- Task helpers ----
def _read_tasks(db_path: Path) -> list[dict[str, object]]:
    if not db_path.exists():
        return []
    return json.loads(db_path.read_text(encoding="utf-8"))


def _write_tasks(db_path: Path, tasks: list[dict[str, object]]) -> None:
    db_path.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")


def add_task(title: str, db_path: Path = DEFAULT_DB_PATH) -> dict[str, object]:
    tasks = _read_tasks(db_path)
    next_id = 1 if not tasks else int(tasks[-1]["id"]) + 1
    task = {"id": next_id, "title": title, "done": False}
    tasks.append(task)
    _write_tasks(db_path, tasks)
    return task


def list_tasks(db_path: Path = DEFAULT_DB_PATH) -> list[dict[str, object]]:
    return _read_tasks(db_path)


def complete_task(task_id: int, db_path: Path = DEFAULT_DB_PATH) -> dict[str, object] | None:
    tasks = _read_tasks(db_path)
    for task in tasks:
        if int(task["id"]) == task_id:
            task["done"] = True
            _write_tasks(db_path, tasks)
            return task
    return None


# ---- Marketplace helpers ----
def _default_market_state() -> dict[str, list[dict[str, object]]]:
    return {"areas": [], "listings": [], "transactions": []}


def _read_market(db_path: Path) -> dict[str, list[dict[str, object]]]:
    if not db_path.exists():
        return _default_market_state()
    return json.loads(db_path.read_text(encoding="utf-8"))


def _write_market(db_path: Path, state: dict[str, list[dict[str, object]]]) -> None:
    db_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def create_area(owner: str, area_name: str, db_path: Path = DEFAULT_MARKET_DB_PATH) -> dict[str, object]:
    state = _read_market(db_path)
    if any(str(area["name"]) == area_name for area in state["areas"]):
        raise ValueError("Bu alan adı zaten mevcut.")

    area = {"name": area_name, "owner": owner}
    state["areas"].append(area)
    _write_market(db_path, state)
    return area


def list_area_for_sale(owner: str, area_name: str, price: float, db_path: Path = DEFAULT_MARKET_DB_PATH) -> dict[str, object]:
    state = _read_market(db_path)

    if price <= 0:
        raise ValueError("Fiyat 0'dan büyük olmalı.")

    area = next((item for item in state["areas"] if str(item["name"]) == area_name), None)
    if area is None:
        raise ValueError("Alan bulunamadı.")
    if str(area["owner"]) != owner:
        raise ValueError("Sadece alan sahibi satış ilanı verebilir.")
    if any(str(listing["area_name"]) == area_name for listing in state["listings"]):
        raise ValueError("Bu alan zaten satışta.")

    listing = {"area_name": area_name, "seller": owner, "price": float(price)}
    state["listings"].append(listing)
    _write_market(db_path, state)
    return listing


def buy_area(buyer: str, area_name: str, db_path: Path = DEFAULT_MARKET_DB_PATH) -> dict[str, object]:
    state = _read_market(db_path)
    listing = next((item for item in state["listings"] if str(item["area_name"]) == area_name), None)
    if listing is None:
        raise ValueError("Alan satışta değil.")

    area = next((item for item in state["areas"] if str(item["name"]) == area_name), None)
    if area is None:
        raise ValueError("Alan bulunamadı.")

    price = float(listing["price"])
    commission = round(price * COMMISSION_RATE, 2)
    seller_payout = round(price - commission, 2)

    area["owner"] = buyer
    state["listings"] = [item for item in state["listings"] if str(item["area_name"]) != area_name]

    transaction = {
        "area_name": area_name,
        "seller": listing["seller"],
        "buyer": buyer,
        "sale_price": price,
        "commission_rate": COMMISSION_RATE,
        "commission_amount": commission,
        "seller_payout": seller_payout,
    }
    state["transactions"].append(transaction)
    _write_market(db_path, state)
    return transaction


def list_market(db_path: Path = DEFAULT_MARKET_DB_PATH) -> list[dict[str, object]]:
    return _read_market(db_path)["listings"]


def list_owner_areas(owner: str, db_path: Path = DEFAULT_MARKET_DB_PATH) -> list[dict[str, object]]:
    return [area for area in _read_market(db_path)["areas"] if str(area["owner"]) == owner]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="son CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="Add a new task")
    add_parser.add_argument("title", help="Task title")

    subparsers.add_parser("list", help="List tasks")

    done_parser = subparsers.add_parser("done", help="Mark task as done")
    done_parser.add_argument("task_id", type=int, help="Task id")

    area_create_parser = subparsers.add_parser("area-create", help="Create/purchase a new area")
    area_create_parser.add_argument("owner", help="Owner username")
    area_create_parser.add_argument("area_name", help="Area name")

    area_sell_parser = subparsers.add_parser("area-sell", help="List owned area for sale")
    area_sell_parser.add_argument("owner", help="Owner username")
    area_sell_parser.add_argument("area_name", help="Area name")
    area_sell_parser.add_argument("price", type=float, help="Sale price")

    area_buy_parser = subparsers.add_parser("area-buy", help="Buy a listed area")
    area_buy_parser.add_argument("buyer", help="Buyer username")
    area_buy_parser.add_argument("area_name", help="Area name")

    subparsers.add_parser("area-market", help="List market listings")

    area_portfolio_parser = subparsers.add_parser("area-portfolio", help="List areas owned by user")
    area_portfolio_parser.add_argument("owner", help="Owner username")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "add":
        task = add_task(args.title)
        print(f"Eklendi: [{task['id']}] {task['title']}")
        return

    if args.command == "list":
        tasks = list_tasks()
        if not tasks:
            print("Henüz görev yok.")
            return
        for task in tasks:
            status = "x" if bool(task["done"]) else " "
            print(f"[{task['id']}] [{status}] {task['title']}")
        return

    if args.command == "done":
        task = complete_task(args.task_id)
        if task is None:
            print("Görev bulunamadı.")
            return
        print(f"Tamamlandı: [{task['id']}] {task['title']}")
        return

    if args.command == "area-create":
        area = create_area(args.owner, args.area_name)
        print(f"Alan oluşturuldu: {area['name']} (sahip: {area['owner']})")
        return

    if args.command == "area-sell":
        listing = list_area_for_sale(args.owner, args.area_name, args.price)
        print(f"İlan açıldı: {listing['area_name']} - {listing['price']} TL")
        return

    if args.command == "area-buy":
        transaction = buy_area(args.buyer, args.area_name)
        print(
            "Satış tamamlandı: "
            f"{transaction['area_name']} | fiyat: {transaction['sale_price']} TL | "
            f"komisyon (%10): {transaction['commission_amount']} TL | "
            f"satıcıya kalan: {transaction['seller_payout']} TL"
        )
        return

    if args.command == "area-market":
        listings = list_market()
        if not listings:
            print("Pazarda aktif ilan yok.")
            return
        for listing in listings:
            print(f"{listing['area_name']} | satıcı: {listing['seller']} | fiyat: {listing['price']} TL")
        return

    if args.command == "area-portfolio":
        areas = list_owner_areas(args.owner)
        if not areas:
            print("Kullanıcının sahip olduğu alan yok.")
            return
        for area in areas:
            print(f"{area['name']} (sahip: {area['owner']})")


if __name__ == "__main__":
    main()
