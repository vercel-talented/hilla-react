package dev.hilla.crud;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
public class TestObject {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    private String name;
    private LocalDate localDate;
    private LocalTime localTime;
    private LocalDateTime localDateTime;
    private Boolean booleanValue;
    private TestEnum enumValue;

    @OneToOne
    private NestedObject nestedObject;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getLocalDate() {
        return localDate;
    }

    public void setLocalDate(LocalDate localDate) {
        this.localDate = localDate;
    }

    public LocalDateTime getLocalDateTime() {
        return localDateTime;
    }

    public void setLocalDateTime(LocalDateTime localDateTime) {
        this.localDateTime = localDateTime;
    }

    public LocalTime getLocalTime() {
        return localTime;
    }

    public void setLocalTime(LocalTime localTime) {
        this.localTime = localTime;
    }

    public Boolean getBooleanValue() {
        return booleanValue;
    }

    public void setBooleanValue(Boolean aBoolean) {
        this.booleanValue = aBoolean;
    }

    public TestEnum getEnumValue() {
        return enumValue;
    }

    public void setEnumValue(TestEnum testEnum) {
        this.enumValue = testEnum;
    }

    public NestedObject getNestedObject() {
        return nestedObject;
    }

    public void setNestedObject(NestedObject nestedObject) {
        this.nestedObject = nestedObject;
    }
}
