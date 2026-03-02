from pathlib import Path

from son.app import (
    add_task,
    buy_area,
    complete_task,
    create_area,
    list_area_for_sale,
    list_market,
    list_owner_areas,
    list_tasks,
    project_status,
)


def test_project_status_mentions_ready_state() -> None:
    message = project_status()
    assert "hazır" in message
    assert "%10" in message


def test_add_and_list_tasks(tmp_path: Path) -> None:
    db_path = tmp_path / "tasks.json"

    task = add_task("İlk görev", db_path=db_path)
    assert task["id"] == 1
    assert task["title"] == "İlk görev"
    assert task["done"] is False

    tasks = list_tasks(db_path=db_path)
    assert len(tasks) == 1
    assert tasks[0]["title"] == "İlk görev"


def test_complete_task(tmp_path: Path) -> None:
    db_path = tmp_path / "tasks.json"
    add_task("Bitirilecek görev", db_path=db_path)

    completed = complete_task(1, db_path=db_path)
    assert completed is not None
    assert completed["done"] is True

    tasks = list_tasks(db_path=db_path)
    assert tasks[0]["done"] is True


def test_area_sale_applies_ten_percent_commission(tmp_path: Path) -> None:
    market_db = tmp_path / "marketplace.json"

    create_area("alice", "billboard-1", db_path=market_db)
    listing = list_area_for_sale("alice", "billboard-1", 250.0, db_path=market_db)
    assert listing["price"] == 250.0

    transaction = buy_area("bob", "billboard-1", db_path=market_db)
    assert transaction["sale_price"] == 250.0
    assert transaction["commission_rate"] == 0.10
    assert transaction["commission_amount"] == 25.0
    assert transaction["seller_payout"] == 225.0

    owners_area = list_owner_areas("bob", db_path=market_db)
    assert len(owners_area) == 1
    assert owners_area[0]["name"] == "billboard-1"
    assert list_market(db_path=market_db) == []


def test_buyer_can_resell_owned_area_with_custom_price(tmp_path: Path) -> None:
    market_db = tmp_path / "marketplace.json"

    create_area("alice", "arena-banner", db_path=market_db)
    list_area_for_sale("alice", "arena-banner", 120.0, db_path=market_db)
    buy_area("bob", "arena-banner", db_path=market_db)

    resale = list_area_for_sale("bob", "arena-banner", 333.0, db_path=market_db)
    assert resale["seller"] == "bob"
    assert resale["price"] == 333.0
