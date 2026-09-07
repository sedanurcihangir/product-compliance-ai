from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import RiskRule
from app.schemas import RiskRuleCreate, RiskRuleResponse, RiskRuleUpdate

router = APIRouter(prefix="/api/risk-rules", tags=["risk-rules"])


@router.post("", response_model=RiskRuleResponse, status_code=status.HTTP_201_CREATED)
def create_risk_rule(payload: RiskRuleCreate, db: Session = Depends(get_db)):
    rule = RiskRule(
        condition=payload.condition,
        risk_level=payload.risk_level,
        explanation=payload.explanation,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("", response_model=list[RiskRuleResponse])
def list_risk_rules(db: Session = Depends(get_db)):
    result = db.execute(select(RiskRule).order_by(RiskRule.id))
    return result.scalars().all()


@router.get("/{risk_rule_id}", response_model=RiskRuleResponse)
def get_risk_rule(risk_rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(RiskRule, risk_rule_id)
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk rule not found.",
        )
    return rule


@router.put("/{risk_rule_id}", response_model=RiskRuleResponse)
def update_risk_rule(
    risk_rule_id: int,
    payload: RiskRuleUpdate,
    db: Session = Depends(get_db),
):
    rule = db.get(RiskRule, risk_rule_id)
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk rule not found.",
        )

    rule.condition = payload.condition
    rule.risk_level = payload.risk_level
    rule.explanation = payload.explanation
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{risk_rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_risk_rule(risk_rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(RiskRule, risk_rule_id)
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk rule not found.",
        )
    db.delete(rule)
    db.commit()
    return None
